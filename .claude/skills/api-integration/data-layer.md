# 데이터 레이어 — env·프록시·apiFetch·fetcher·스웨거·검증

`api-integration` 스킬의 코드 패턴. 여기 있는 골격을 그대로 따른다. 색·문구·토큰 규칙은 각 앱 퍼블리싱 스킬을 따른다.

---

## 1. env & (클라 fetch 생기면) 프록시

BE는 로컬 Spring `http://localhost:8080`. **base URL은 서버 전용 env로 두고 클라에 노출하지 않는다.**

각 앱 루트에 `.env.local`(git 무시) — 값이 없으면 서버 fetch가 죽으니 개발자마다 둔다:

```bash
# apps/mobile/.env.local  /  apps/web/.env.local
API_BASE_URL=http://localhost:8080
```

그리고 **커밋되는** `.env.example`에 자리만 남겨 팀이 복사하게 한다:

```bash
# apps/mobile/.env.example  /  apps/web/.env.example
API_BASE_URL=http://localhost:8080
```

> `NEXT_PUBLIC_` 접두어를 **일부러 안 붙였다.** 서버 컴포넌트 fetch는 서버에서 돌아 base가 클라로 샐 일이 없고,
> 공개 env로 두면 나중에 프록시로 옮길 때 되돌려야 한다.

### 클라 fetch(=RQ)가 처음 생길 때 → same-origin 프록시로 CORS 제거

서버 컴포넌트 fetch는 서버→서버라 CORS가 없다. 하지만 브라우저(RQ)가 `localhost:3001`에서 `localhost:8080`을
직접 때리면 **cross-origin**이라 CORS에 막힌다. BE에 CORS를 여는 대신, **Next `rewrites`로 same-origin 프록시**를
깔아 브라우저는 상대경로 `/be/*`만 부르게 한다(base가 한 곳에 모이고 CORS가 사라진다):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const base = process.env.API_BASE_URL ?? "http://localhost:8080";
    return [{ source: "/be/:path*", destination: `${base}/:path*` }];
  },
};

export default nextConfig;
```

그러면 `apiFetch`는 서버에선 절대 URL, 클라에선 `/be` 상대경로를 쓰게 base를 고른다(아래 §3). **이 프록시는 릴스
페이지네이션/뮤테이션으로 클라 fetch가 처음 필요해질 때 깐다** — 그 전 서버 전용 단계에선 필요 없다.

### 캐시 3층 — 헷갈리지 않게 (fetch가 어디서 도느냐가 가른다)

| 캐시                   | 어디               | 공유               | 제어                                       | 히트하면                       |
| ---------------------- | ------------------ | ------------------ | ------------------------------------------ | ------------------------------ |
| **Next 데이터 캐시**   | 서버               | **모든 유저 공유** | 서버 `fetch`의 `next:{ revalidate, tags }` | 서버 `fetch`가 BE 안 때림      |
| **브라우저 HTTP 캐시** | 각 유저 브라우저   | 사적               | BE 응답 헤더 `Cache-Control`·`ETag`(자동)  | fetch는 부르되 네트워크만 스킵 |
| **RQ 캐시**            | 브라우저 JS 메모리 | 사적               | `queryKey`·`staleTime`                     | **fetch 호출 자체를 안 함**    |

- 셋은 **서로의 존재를 모른다.** 같은 fetch에 동시에 끼지 않고, **실행 장소**가 후보를 가른다 — 서버 fetch면 Next 데이터 캐시,
  브라우저 fetch면 브라우저 HTTP 캐시(+ RQ가 감싸면 RQ 캐시).
- 그래서 서버가 받은 데이터가 클라 RQ 캐시엔 안 들어간다 → 릴스 이중 페치. 그 다리가 **하이드레이션**([tanstack-query.md](tanstack-query.md) §5).
- `next:{ revalidate }`는 **서버 전용** — 클라 fetch에선 무시되고 표준 `cache` 옵션만 먹는다. 배경: [ADR 0017](../../docs/adr/0017-api-integration-strategy.md).

---

## 2. 스웨거를 실제로 읽는다 (티켓을 믿지 말 것)

응답 shape의 **진실은 스웨거**다. 붙이기 전 항상 실제 스펙을 확인한다.

- **스웨거 UI**: `http://localhost:8080/swagger-ui/index.html` — 브라우저로 열어 해당 엔드포인트 펼치고
  "Try it out"으로 진짜 응답을 받아본다(status·필드·null 여부·페이지네이션 래핑까지).
- **스펙 JSON**(정확한 필드·타입 대조용): `http://localhost:8080/v3/api-docs` — 필요한 스키마만 뽑아본다.

  ```bash
  # 특정 경로의 응답 스키마만 추려 보기
  curl -s http://localhost:8080/v3/api-docs | jq '.paths["/posts"].get.responses'
  # 스키마 정의 확인
  curl -s http://localhost:8080/v3/api-docs | jq '.components.schemas.PostResponse'
  ```

확인해 기록할 것: **경로·메서드 · path/query 파라미터 · 요청 body · 응답 필드와 타입 · 페이지네이션 모양
(`content`/`totalPages`류 or cursor) · 에러 응답 shape**. 이 실제 shape를 §3 도메인 타입 대조의 입력으로 쓴다.

> Spring 응답은 보통 `snake_case`가 아니라 `camelCase`지만 **믿지 말고 확인**한다. `LocalDateTime` → ISO 문자열,
> 페이지네이션은 `Page<T>`(→ `content`, `totalElements`, `last`)로 감싸 오는 경우가 흔하다. 전부 경계에서 흡수한다(§4).

---

## 3. `apiFetch` 클라이언트 (앱별 `_lib/api.ts`)

얇은 래퍼 하나. base 선택 · JSON 파싱 · 에러 정규화 · 인증 봉합점만 담당한다. 도메인 지식은 넣지 않는다.

```ts
/**
 * @file BE fetch 얇은 래퍼. base 선택·JSON 파싱·에러 정규화·(미래) 토큰 주입만.
 * 도메인 변환은 각 fetcher(getPosts 등)에서 한다.
 */

/** BE가 정상 범위 밖 status를 줄 때 던지는 에러 (호출부가 잡아 에러 UI로). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 서버에선 절대 URL, 브라우저에선 same-origin 프록시(/be)로. */
function baseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_BASE_URL ?? "http://localhost:8080";
  }
  return "/be"; // next.config rewrites (data-layer §1)
}

/**
 * BE 엔드포인트를 호출하고 JSON을 반환한다.
 *
 * @param path `/posts` 처럼 앞에 슬래시를 포함한 경로
 * @throws {ApiError} status가 2xx가 아닐 때
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      // 인증 붙을 때 여기서 토큰 주입 (SKILL §7 / data-layer §6)
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}
```

`init`으로 서버 fetch 캐시를 조절한다(신선도 요구가 나오면 엔드포인트별로): `apiFetch("/posts", { next: { revalidate: 60 } })`.

---

## 4. 도메인 fetcher + 경계 변환 (`_lib/getPosts.ts` …)

BE 응답 타입은 **fetcher 파일 로컬**에 두고, 여기서 도메인 타입(`FeedPost` 등)으로 변환한다. 화면은 도메인 타입만 본다.

```ts
import type { FeedPost } from "./types";
import { apiFetch } from "./api";

/** BE 응답 shape (이 파일 로컬 — 스웨거 §2에서 확인한 그대로). */
interface PostResponse {
  id: string;
  teamCode: string;
  viewCount: number;
  createdAt: string; // ISO
  // …스웨거에서 본 필드
}

/** Spring Page<T> 래핑 (페이지네이션 응답이면). */
interface Page<T> {
  content: T[];
  totalElements: number;
  last: boolean;
}

/** BE → 도메인 경계 변환. 필드명·모양 차이를 여기서 전부 흡수한다. */
function toFeedPost(r: PostResponse): FeedPost {
  return {
    id: r.id,
    team: r.teamCode as FeedPost["team"],
    views: r.viewCount, // view_count/viewCount → views
    // …나머지 매핑
  } as FeedPost;
}

/** 홈 피드 상위 게시물. 서버 컴포넌트에서 await 해 쓴다. */
export async function getHotPosts(): Promise<FeedPost[]> {
  const page = await apiFetch<Page<PostResponse>>("/posts?section=hot", {
    next: { revalidate: 60 },
  });
  return page.content.map(toFeedPost);
}
```

### 서버 컴포넌트 교체 (mock import → await fetcher)

지금 페이지가 `HOT_POSTS`를 import해 props로 내리는 구조라, **한 줄 교체**다:

```diff
- import { HOT_POSTS, NEWS_POSTS } from "@/_lib/mock";
+ import { getHotPosts, getNewsPosts } from "@/_lib/getPosts";

- export default function HomePage() {
+ export default async function HomePage() {
+   const [hot, news] = await Promise.all([getHotPosts(), getNewsPosts()]);
    return (
      <AppShell>
        …
-       <HotCarousel posts={HOT_POSTS} />
+       <HotCarousel posts={hot} />
```

`_components`는 **손대지 않는다** — 여전히 `FeedPost[]`를 props로 받는다. 로딩은 라우트에 `loading.tsx`, 에러는 `error.tsx`(SKILL §5).

---

## 5. 로컬 BE로 검증

1. BE를 `localhost:8080`에 띄우고 스웨거가 열리는지 먼저 확인.
2. 프런트 dev: `pnpm --filter mobile dev`(:3001) / `pnpm --filter web dev`(:3000).
3. 화면을 열고 **네트워크 탭에서 실제 요청/응답을 눈으로 본다** — status, 응답 필드가 매핑과 맞는지.
4. 네 상태를 실제로 밟는다: **성공 · 로딩(느린 네트워크 스로틀) · 에러(BE 잠깐 끄기) · 빈 상태(빈 배열 응답)**.
5. **CORS 에러**가 콘솔에 뜨면(브라우저 직접 호출) → §1 프록시(`/be` rewrites)를 깔았는지 확인. 서버 컴포넌트 fetch만
   쓰는 단계면 CORS는 안 난다(서버→서버).

---

## 6. 인증 봉합점 (지금은 비어 있음)

공개 API 단계라 토큰 주입은 **자리만** 있다(§3 `apiFetch`의 headers 주석). 인증이 붙으면:

- 저장 위치·주입 방식은 **사용자에게 확인**(헤더 Bearer vs HttpOnly 쿠키). 추측 금지.
- **자격증명(토큰·비밀번호)을 코드로 직접 입력·저장하지 않는다** — 안전 규칙 준수. 주입 지점만 열어두고 값은 사용자 몫.
- 서버 컴포넌트는 요청 컨텍스트(쿠키)에서, 클라(RQ)는 프록시가 쿠키를 실어보내게 하는 식으로 갈릴 수 있음 — 확정 시 이 파일에 기입.
