/**
 * @file 무한 쿼리 피드를 첫 페이지부터 다시 받는 공통 동작 (KAN-379).
 *
 * 탭 재탭·당겨서 새로고침이 부르던 `resetQueries`를 대체한다. 리셋은 캐시를
 * 초기 상태로 되돌리므로 화면이 [보던 목록] → [서버 씨앗 또는 스켈레톤] →
 * [새 목록]으로 두 번 갈아 끼워져 깜빡인다. 여기서는 쌓인 페이지를 첫 페이지
 * 하나로 줄인 뒤 refetch한다 — 데이터가 비는 순간이 없어 새 응답이 올 때까지
 * 보던 목록이 그대로 남고, 응답이 오면 한 번만 바뀐다.
 *
 * 첫 페이지로 줄이는 이유는 리셋 때와 같다(모바일 `useHomeRefresh` KAN-314 주석
 * 참고). 커서 체인 무한 쿼리를 여러 페이지째로 refetch하면 앞 페이지가 와야
 * 다음 커서를 알 수 있어 요청이 페이지 수만큼 줄지어 나간다. 어차피 갱신과 함께
 * 맨 위로 올라가므로 뒷 페이지를 되살릴 이유가 없다.
 */

import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

/**
 * 무한 쿼리를 첫 페이지 하나로 줄이고 다시 받는다.
 *
 * 캐시에 데이터가 아직 없으면(첫 로드 실패 직후 등) 줄일 것도 없으므로
 * `resetQueries`로 처음부터 받는다 — 이때는 원래도 보여줄 목록이 없어
 * 스켈레톤이 뜨는 게 맞다.
 *
 * @param queryClient 앱의 QueryClient
 * @param queryKey 대상 피드의 정확한 쿼리키 (예: `articleKeys.feed(filter)`)
 * @returns 화면에 붙어 있는 쿼리의 refetch가 끝나면 resolve — 스피너가 이걸 기다린다
 */
export async function restartFeedQuery(
  queryClient: QueryClient,
  queryKey: QueryKey,
): Promise<void> {
  const data = queryClient.getQueryData<InfiniteData<unknown>>(queryKey);
  if (!data || data.pages.length === 0) {
    await queryClient.resetQueries({ queryKey });
    return;
  }

  queryClient.setQueryData<InfiniteData<unknown>>(queryKey, {
    pages: data.pages.slice(0, 1),
    pageParams: data.pageParams.slice(0, 1),
  });
  await queryClient.refetchQueries({ queryKey, type: "active" });
}
