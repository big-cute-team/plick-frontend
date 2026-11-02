"use client";

import { useEffect, useState } from "react";

/** 목록을 보고 있는 동안에도 마감 시각에 잠금과 정렬을 갱신한다. */
export function useDebateClock(
  items: readonly { closesAt: string | null }[],
  onClose?: () => unknown,
) {
  const [now, setNow] = useState(Date.now);
  const deadline = items.reduce((nearest, item) => {
    const at = item.closesAt ? new Date(item.closesAt).getTime() : Infinity;
    return at > now ? Math.min(nearest, at) : nearest;
  }, Infinity);
  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    const timer = setTimeout(
      () => {
        const current = Date.now();
        setNow(current);
        // 32비트 타이머 상한으로 일찍 깨어난 경우에는 조회하지 않는다.
        if (current >= deadline) onClose?.();
      },
      Math.min(Math.max(deadline - Date.now(), 0), 0x7fffffff),
    );
    return () => clearTimeout(timer);
  }, [deadline, now, onClose]);
  return now;
}
