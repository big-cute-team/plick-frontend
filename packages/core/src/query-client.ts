/**
 * @file 앱 공통 QueryClient 팩토리. 두 앱 `_queries/query-client.ts`에 동일
 * 구현으로 복제돼 있던 것을 web 기사 피드 이식(KAN-321)에서 승격했다.
 * 각 앱 `QueryProvider`(클라 컴포넌트)는 앱에 남아 이 팩토리만 가져다 쓴다.
 */

import { isServer, QueryClient } from "@tanstack/react-query";
import type { QueryClientConfig } from "@tanstack/react-query";

/**
 * 기본 staleTime을 둬서 SSR 직후 클라이언트가 곧바로 같은 데이터를
 * 다시 fetch하는 낭비를 막는다. 앱이 넘긴 config는 이 기본 위에 얹는다.
 */
function makeQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config?.defaultOptions,
      queries: {
        staleTime: 60_000,
        ...config?.defaultOptions?.queries,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * TanStack Query 공식 SSR 패턴 — 서버는 요청마다 새 인스턴스(요청 간 캐시 격리),
 * 브라우저는 모듈 싱글턴을 재사용한다.
 *
 * @param config 앱별 정책 주입(KAN-447) — 모바일이 throwOnError 기본값과
 *   MutationCache 전역 onError를 넘긴다. 브라우저 싱글턴은 처음 만든 config로
 *   굳으므로 앱은 모듈 스코프 상수로 넘겨야 한다. 뮤테이션은 클라 전용이라
 *   서버 인스턴스들이 MutationCache 객체를 공유해도 상태가 섞일 일이 없다.
 */
export function getQueryClient(config?: QueryClientConfig): QueryClient {
  if (isServer) {
    return makeQueryClient(config);
  }
  browserQueryClient ??= makeQueryClient(config);
  return browserQueryClient;
}
