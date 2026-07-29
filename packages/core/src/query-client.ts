/**
 * @file 앱 공통 QueryClient 팩토리. 두 앱 `_queries/query-client.ts`에 동일
 * 구현으로 복제돼 있던 것을 web 기사 피드 이식(KAN-321)에서 승격했다.
 * 각 앱 `QueryProvider`(클라 컴포넌트)는 앱에 남아 이 팩토리만 가져다 쓴다.
 */

import { isServer, QueryClient } from "@tanstack/react-query";

/**
 * 기본 staleTime을 둬서 SSR 직후 클라이언트가 곧바로 같은 데이터를
 * 다시 fetch하는 낭비를 막는다.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * TanStack Query 공식 SSR 패턴 — 서버는 요청마다 새 인스턴스(요청 간 캐시 격리),
 * 브라우저는 모듈 싱글턴을 재사용한다.
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
