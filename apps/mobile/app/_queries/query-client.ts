import { isServer, QueryClient } from "@tanstack/react-query";

/**
 * 앱 공통 QueryClient 팩토리 — 기본 staleTime을 둬서 SSR 직후
 * 클라이언트가 곧바로 같은 데이터를 다시 fetch하는 낭비를 막는다.
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
