"use client";

import { MutationCache, QueryClientProvider } from "@tanstack/react-query";
import type { QueryClientConfig } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { getQueryClient } from "@plick/core/query-client";
import { ERROR_TOAST_FALLBACK } from "@/_constants/feedback";
import { useErrorToast } from "@/_stores/error-toast";

/**
 * 화면 상태로 처리되는 에러 코드 — 전역 토스트를 띄우지 않는다.
 * AUTH_REQUIRED는 각 화면이 로그인 유도 팝업으로, DEBATE_CLOSED는 투표 카드가
 * 마감 전환으로 받는다(KAN-436). 여기서 또 알리면 이중 안내가 된다.
 */
const SCREEN_HANDLED_CODES = new Set(["AUTH_REQUIRED", "DEBATE_CLOSED"]);

/**
 * 모바일 앱의 쿼리 전역 정책 (KAN-447).
 *
 * throwOnError: 보여줄 데이터가 하나도 없는 실패만 가장 가까운 에러바운더리로
 * 던진다. 캐시가 있으면(다음 페이지 실패, 백그라운드 refetch 실패) 화면을
 * 유지한 채 쿼리 상태로 남긴다 — 스크롤하던 목록을 에러 화면으로 바꾸지 않는다.
 * 에러를 직접 소유하는 화면(릴스 커서 복구 등)은 훅에서 false로 끈다.
 *
 * mutationCache.onError: 뮤테이션 실패의 전역 안전망. 콜사이트가 처리하든 안
 * 하든 항상 불리므로, 완결 처리하는 훅은 meta.errorHandled로 빠진다. 이 망이
 * 없던 시절엔 onError를 안 단 뮤테이션(좋아요·차단 해제)이 실패해도 화면이
 * 무반응이었다 — 이제 빼먹은 자리는 기본으로 토스트가 받는다.
 *
 * 브라우저 QueryClient 싱글턴이 처음 받은 config로 굳으므로 모듈 스코프 상수다.
 */
const MOBILE_QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      throwOnError: (_error, query) => query.state.data === undefined,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.errorHandled) return;
      if (error instanceof ApiError && SCREEN_HANDLED_CODES.has(error.code)) {
        return;
      }
      useErrorToast
        .getState()
        .show(error instanceof ApiError ? error.message : ERROR_TOAST_FALLBACK);
    },
  }),
};

/**
 * 루트 레이아웃에서 클라 트리에 QueryClient를 공급한다.
 * useState로 만들지 않고 렌더 중 getQueryClient()를 호출한다 — React가 suspend로
 * 초기 렌더를 버려도 클라이언트가 유실되지 않는 TanStack 권장 패턴.
 *
 * @param children 서버 컴포넌트 그대로 통과한다(children-as-props)
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient(MOBILE_QUERY_CONFIG);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
