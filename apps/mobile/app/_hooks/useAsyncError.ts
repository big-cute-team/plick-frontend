"use client";

import { useCallback, useState } from "react";

/**
 * 비동기 콜백에서 받은 에러를 가장 가까운 에러바운더리로 보낸다 (KAN-447).
 *
 * 에러바운더리는 렌더링 도중 던져진 에러만 잡는다. 이벤트 핸들러나 프로미스
 * 콜백은 렌더링 바깥 콜스택이라 거기서 throw해도 경계가 개입할 자리가 없다.
 * 그래서 에러를 state 갱신 함수에 실어 두고, React가 다음 렌더에서 그 함수를
 * 실행할 때 다시 던지게 한다 — 렌더 중 throw로 바뀌므로 경계 관할이 된다.
 *
 * TanStack Query를 지나는 에러는 throwOnError가 같은 일을 해 주므로 이 훅이
 * 필요 없다. RQ 밖의 비동기 — 복구 절차나 직접 부르는 서버 액션 — 가 대상이다.
 *
 * @returns 에러를 넘기면 다음 렌더에서 다시 던지는 함수
 * @example
 *   const throwAsync = useAsyncError();
 *   restartFeedQuery(queryClient, key).catch(throwAsync);
 */
export function useAsyncError(): (error: unknown) => void {
  const [, setError] = useState<undefined>(undefined);

  return useCallback((error: unknown) => {
    setError(() => {
      throw error;
    });
  }, []);
}
