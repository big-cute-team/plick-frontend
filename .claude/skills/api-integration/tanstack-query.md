# TanStack Query — 언제 도입하고 어떻게 쓰나

`api-integration` 스킬의 클라이언트 캐시 계층. **처음부터 깔지 않는다.** 아래 트리거가 처음 서는 엔드포인트에서 도입한다.

---

## 1. 도입 트리거 (이 중 하나라도면 RQ, 아니면 서버 fetch)

- 릴스/피드 **다음 페이지를 클라에서 이어 부르거나** 다음 항목을 **prefetch** 해야 한다.
- **뮤테이션**(좋아요·투표·댓글)에 **낙관적 업데이트 + 실패 롤백**이 필요하다.
- 같은 데이터를 여러 클라 컴포넌트가 **공유·리페치**해야 한다(포커스 리페치 등).

셋 다 아니면(단발 읽기) → 서버 컴포넌트 fetch. RQ 안 쓴다([data-layer.md](data-layer.md)).

첫 도입 시 설치(그 앱에서 처음 필요할 때만):

```bash
pnpm --filter mobile add @tanstack/react-query
```

---

## 2. Provider (앱당 한 번)

`app/_components/QueryProvider.tsx` (클라 컴포넌트) → 루트 `layout.tsx`에서 children을 감싼다.

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/** RQ 클라이언트를 컴포넌트 트리에 제공한다. 루트 layout에서 children을 감싼다. */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

---

## 3. 쿼리키 규약

배열로 계층화한다. 도메인 → 스코프 → 파라미터 순. 무효화(invalidate)가 쉬워진다.

```ts
export const postKeys = {
  all: ["posts"] as const,
  feed: (section: string) => ["posts", "feed", section] as const,
  detail: (id: string) => ["posts", "detail", id] as const,
};
```

---

## 4. 릴스 무한스크롤 + prefetch

`useInfiniteQuery`가 페이지네이션·중복요청 제거·다음 페이지 로딩을 대신한다. fetcher는 [data-layer.md](data-layer.md) §4의 도메인 fetcher를 쓴다(커서/offset은 스웨거에서 확인해 맞춘다).

```tsx
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getPostsPage } from "@/_lib/getPosts";
import { postKeys } from "@/_lib/postKeys";
import type { FeedPost } from "@/_lib/types";

/**
 * 릴스 피드. 서버가 받은 첫 페이지를 initialData로 심어 이중 페치를 막는다(§5).
 */
export function useReelsFeed(initial: {
  posts: FeedPost[];
  nextCursor: string | null;
}) {
  return useInfiniteQuery({
    queryKey: postKeys.feed("reels"),
    queryFn: ({ pageParam }) => getPostsPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor, // 스웨거의 실제 필드명에 맞춘다
    initialData: { pages: [initial], pageParams: [null] },
  });
}
```

**prefetch(다음 항목 미리 당기기)**: 현재 릴에서 마지막 근처에 오면 `fetchNextPage()`를 호출하거나,
개별 상세를 미리 채우려면 `queryClient.prefetchQuery({ queryKey: postKeys.detail(nextId), queryFn })`.

---

## 5. 서버 → 클라 하이드레이션 (릴스: 첫 페이지는 서버가)

**왜 필요한가**: 서버 컴포넌트가 받은 1페이지는 서버 렌더에만 쓰이고 사라진다. 클라의 RQ 캐시는 비어 있어서,
릴스 훅이 마운트되면 같은 1페이지를 **또 fetch한다**(이중 페치 + 로딩 깜빡임). 그래서 서버가 받은 걸 **클라 RQ 캐시에
씨앗으로 심어** 준다.

**`HydrationBoundary`가 그 다리다**: 서버가 채운 캐시를 `dehydrate()`로 JSON으로 말려 경계를 넘기고,
`<HydrationBoundary state={…}>`가 그 JSON을 **클라 QueryClient에 도로 부어넣는다**(hydrate). 그러면 클라 훅이 같은
쿼리키로 호출될 때 데이터가 이미 캐시에 있어 fetch를 건너뛴다. 두 방식 중 택1:

- **가벼운 방식(권장 시작점)**: 서버에서 첫 페이지를 `await` → 클라 컴포넌트에 **props로** 넘기고 위 훅의 `initialData`로.
  씨앗 심을 쿼리가 하나면 이거면 충분하다.
- **정석(HydrationBoundary)**: 서버에서 `queryClient.prefetchInfiniteQuery` → `dehydrate` → `<HydrationBoundary state={…}>`로 감싸기.
  캐시 전체를 싸주니 **한 페이지에서 여러 쿼리를 미리 채워** 여러 자식이 각자 집어가게 할 때(props로 안 넘기고) 이쪽.

```tsx
// app/reels/page.tsx (서버 컴포넌트)
import { getPostsPage } from "@/_lib/getPosts";
import { ReelsFeed } from "./_components/ReelsFeed"; // "use client", 위 훅 사용

export default async function ReelsPage() {
  const initial = await getPostsPage(null); // 첫 페이지
  return <ReelsFeed initial={initial} />;
}
```

---

## 6. 낙관적 뮤테이션 (좋아요·투표·댓글)

`onMutate`에서 캐시를 먼저 바꾸고, `onError`에서 롤백, `onSettled`에서 정합성 맞춘다.

```tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePost } from "@/_lib/likePost";
import { postKeys } from "@/_lib/postKeys";
import type { FeedPost } from "@/_lib/types";

/** 좋아요 토글 — UI를 먼저 바꾸고, 실패하면 되돌린다. */
export function useLikePost(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) => likePost(id, liked),
    onMutate: async (liked) => {
      await qc.cancelQueries({ queryKey: postKeys.detail(id) });
      const prev = qc.getQueryData<FeedPost>(postKeys.detail(id));
      qc.setQueryData<FeedPost>(postKeys.detail(id), (p) =>
        p ? { ...p, liked, likeCount: p.likeCount + (liked ? 1 : -1) } : p,
      );
      return { prev };
    },
    onError: (_e, _liked, ctx) => {
      if (ctx?.prev) qc.setQueryData(postKeys.detail(id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: postKeys.detail(id) }),
  });
}
```

---

## 7. 로딩·에러·빈 상태 (RQ판)

서버 fetch의 `loading.tsx`/`error.tsx` 대신 훅 상태로 분기한다 — 색·문구는 동일하게 토큰/카피 규칙(SKILL §5):

- 로딩: `isPending` → 스켈레톤(`bg-elevate`/`bg-media`).
- 에러: `isError` → 재시도(`refetch()`) 버튼(기존 버튼 토큰).
- 빈 상태: 데이터가 빈 배열 → 기존 "아직 …없어요"(`text-text-4`) 패턴.

> **Suspense·ErrorBoundary는 처음부터 따로 안 잡아도 된다.** 서버 fetch는 라우트 `loading.tsx`/`error.tsx`가 곧
> Next가 자동으로 감싸주는 서스펜스/에러 경계다(`error.tsx`는 `"use client"` 필수). RQ 기본 모드(`useQuery`)는
> 위처럼 `isPending`/`isError`를 값으로 분기하니 경계가 필요 없다. `useSuspenseQuery`(promise를 던지는 모드)를
> **일부러 쓸 때만** 바깥에 `<Suspense>` + 에러바운더리를 둔다 — 이것도 "필요해질 때 도입". 라우트 `error.tsx` 하나는
> RQ 여부와 무관하게 예상 못 한 렌더 에러의 마지막 그물로 두는 게 싸고 좋다(권장).

---

## 8. 공용화

RQ provider·쿼리키 규약·`apiFetch`는 **첫 앱에선 앱별 `_lib`**. 두 번째 앱이 같은 규약을 쓰게 되면 `@plick/core` 승격을
ADR 0011 게이트로 판단한다(SKILL §3). 첫 앱에서 미리 빼지 않는다.
