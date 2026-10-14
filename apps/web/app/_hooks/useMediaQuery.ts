"use client";

import { useSyncExternalStore } from "react";

/**
 * 미디어 쿼리 일치 여부 (KAN-652). 서버와 첫 하이드레이션은 `null`이고 그 뒤 실제
 * 창 폭을 따른다. 광고 상자(`<ins>`)는 보이지 않을 때 push하면 폭 0으로 죽어 다시
 * 살아나지 않으므로, CSS로 숨기는 자리는 이 값이 true일 때만 상자를 마운트한다.
 *
 * @param query 미디어 쿼리. 없으면 늘 true
 */
export function useMediaQuery(query?: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      if (!query) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => (query ? window.matchMedia(query).matches : true),
    () => null,
  );
}
