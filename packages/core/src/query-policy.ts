/**
 * @file 클라 쿼리 캐시·재시도 정책 (KAN-685 승부예측 훅 승격에서 두 앱 `_constants/feed.ts`,
 * `_constants/live.ts`의 같은 값을 올렸다).
 *
 * 두 앱이 KAN-321부터 "캐시 정책은 표면 성격 따라 갈릴 수 있는 앱 정책"이라 복제해 왔는데 한 번도
 * 갈린 적이 없고, 승부예측 읽기 훅이 core로 올라오면서 값을 둘 자리가 필요해졌다. 앱 상수 파일은
 * 여기서 다시 내보내(re-export) 앱 call site는 그대로고, 어느 앱이 정말 다른 값을 써야 하면 그 파일에서
 * 자기 값을 선언하면 된다.
 */

import { ApiError } from "./client";

/**
 * 피드를 신선한 것으로 보는 시간(ms). `staleTime`과 `gcTime`에 같은 값을 쓴다.
 *
 * 둘을 붙여 두는 게 핵심이다. 무한 쿼리의 재요청은 쌓인 페이지를 전부 순차로 다시
 * 받는데(커서 체인이라 앞 페이지 응답이 와야 다음 커서를 알아 병렬도 안 된다),
 * `gcTime`이 `staleTime`보다 길면 그 사이 구간에서 정확히 그 일이 벌어진다.
 * 30페이지까지 넘기고 화면을 떠났다 그 구간에 돌아오면 요청이 30개 나간다.
 *
 * 같은 값으로 붙이면 그 구간이 사라진다. 신선하면 캐시를 그대로 쓰고(요청 0),
 * 신선하지 않으면 엔트리가 이미 정리돼 서버 컴포넌트가 방금 받아 온 첫 페이지가
 * 씨앗으로 들어간다(역시 요청 0). 화면에 올 때마다 서버는 어차피 첫 페이지를 받고
 * 있었으므로, 버려지던 그 결과가 여기서 쓰인다.
 *
 * 원래 1분이었는데 30분으로 올렸다 (KAN-314). 보던 자리로 되돌려 주려면
 * (`useViewState`) 그 자리를 만들던 페이지들이 캐시에 남아 있어야 한다. 대신 30분
 * 동안은 화면에 다시 들어와도 자동 갱신이 걸리지 않아 갱신을 사용자 손(당겨서
 * 새로고침, 탭 재탭)에 붙였다.
 *
 * 둘 중 하나만 바꾸면 위 구간이 조용히 되살아나므로 반드시 같이 움직인다.
 */
export const FEED_FRESH_MS = 1_800_000;

/** 4xx는 다시 보내도 같은 답이라 재시도하지 않는다. 순단만 이 횟수까지 다시 시도한다. */
export const FEED_MAX_RETRIES = 2;

/**
 * 라이브 계열 순단 재시도 횟수. 502(외부 API 실패)는 다시 보내면 캐시가 채워져 성공할 수
 * 있어 한 번은 다시 시도하고, 그 이상은 에러 지면의 다시 시도에 맡긴다.
 */
export const LIVE_MAX_RETRIES = 1;

/**
 * 4xx는 재시도하지 않고 그 밖(순단, 5xx)만 `max`번까지 다시 시도하는 TanStack Query `retry` 함수.
 * 무한 쿼리 훅마다 같은 클로저를 적던 것을 모았다. 4xx는 다시 보내도 같은 답이기 때문이다.
 *
 * @param max 순단 재시도 상한. 기본은 피드와 같은 {@link FEED_MAX_RETRIES}
 * @example retry: retryUnlessClientError()
 */
export function retryUnlessClientError(
  max: number = FEED_MAX_RETRIES,
): (failureCount: number, error: unknown) => boolean {
  return (failureCount, error) => {
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500
    ) {
      return false;
    }
    return failureCount < max;
  };
}
