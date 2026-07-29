"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@plick/core/query-client";

/**
 * 루트 레이아웃에서 클라 트리에 QueryClient를 공급한다.
 * useState로 만들지 않고 렌더 중 getQueryClient()를 호출한다 — React가 suspend로
 * 초기 렌더를 버려도 클라이언트가 유실되지 않는 TanStack 권장 패턴.
 *
 * @param children 서버 컴포넌트 그대로 통과한다(children-as-props)
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
