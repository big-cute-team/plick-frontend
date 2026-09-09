"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { liveKeys } from "@plick/core/liveKeys";

/**
 * 라이브 경기 목록을 다시 받는다 (KAN-462) — LIVE 탭 맨 위에서 당겼을 때 도는
 * 동작. 화면의 목록은 전부 `useMatches` 쿼리가 들고 있으므로 그 날짜의 쿼리만
 * 다시 받으면 되고, 서버 씨앗은 첫 렌더에만 쓰여 `router.refresh()`는 부르지
 * 않는다(홈은 서버 컴포넌트 캐러셀이 있어 함께 갱신하지만 여기는 없다).
 *
 * `refetchQueries`는 캐시를 비우지 않고 제자리에서 갱신하므로 옛 목록이 그대로
 * 보이다 새 값으로 바뀐다 — `resetQueries`처럼 스켈레톤이 스치지 않는다.
 *
 * @param date 지금 보고 있는 날짜 키. 없으면(순위표 라우트) 아무것도 하지 않는다
 */
export function useLiveRefresh(date?: string) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      date
        ? queryClient.refetchQueries({ queryKey: liveKeys.matches(date) })
        : Promise.resolve(),
    [queryClient, date],
  );
}
