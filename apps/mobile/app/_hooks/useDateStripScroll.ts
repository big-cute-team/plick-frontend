"use client";

import { useEffect, useRef, type RefObject } from "react";
import { DATE_STRIP_KEEP_PAD } from "@/_constants/live";

/**
 * 한 달 날짜 줄의 가로 스크롤 자리 잡기 (KAN-459, KAN-569).
 *
 * 처음 들어올 때와 달이 바뀔 때만 선택 칸(`aria-current="date"`)을 줄 가운데로
 * 당긴다. 같은 달 안에서 날짜가 바뀌면 가운데로 당기지 않고, 선택 칸이 줄 밖으로
 * 밀려났거나 가장자리에 걸렸을 때만 {@link DATE_STRIP_KEEP_PAD}를 남기고 보이는
 * 데까지 민다. 칸을 누를 때마다 가운데로 당기면 줄이 통째로 튀고, 그대로 두면 끝
 * 칸을 눌렀을 때나 목록을 스와이프해 하루씩 넘길 때 선택 칸이 가려진다.
 *
 * scrollIntoView는 조상 스크롤까지 건드려 페이지가 튈 수 있어 직접 계산한다.
 *
 * @param stripRef 가로 스크롤 줄
 * @param selected 선택한 날짜 키
 * @param monthKey 줄이 담은 달(`YYYY-M`). 바뀌면 가운데 정렬을 다시 한다
 */
export function useDateStripScroll(
  stripRef: RefObject<HTMLElement | null>,
  selected: string,
  monthKey: string,
) {
  /* 하이드레이션 직후 줄 폭이 0으로 재지는 프레임이 있어 폭이 잡힐 때까지 rAF로 미룬다 */
  useEffect(() => {
    let raf = 0;
    const center = () => {
      const strip = stripRef.current;
      const cell = strip?.querySelector<HTMLElement>('[aria-current="date"]');
      if (!strip || !cell) return;
      const stripRect = strip.getBoundingClientRect();
      if (stripRect.width === 0) {
        raf = requestAnimationFrame(center);
        return;
      }
      const cellRect = cell.getBoundingClientRect();
      strip.scrollLeft +=
        cellRect.left +
        cellRect.width / 2 -
        (stripRect.left + stripRect.width / 2);
    };
    raf = requestAnimationFrame(center);
    return () => cancelAnimationFrame(raf);
    // 같은 달 안의 날짜 선택은 가운데로 당기지 않는다. selected를 의존성에 넣지 않는 이유
  }, [stripRef, monthKey]);

  /* 달이 바뀌는 순간은 위 가운데 정렬이 맡는다. 둘이 같은 프레임에 다른 목표로
     스크롤을 건드리면 줄이 두 번 움직인다 */
  const prevMonth = useRef(monthKey);
  useEffect(() => {
    const monthChanged = prevMonth.current !== monthKey;
    prevMonth.current = monthKey;
    if (monthChanged) return;

    const strip = stripRef.current;
    const cell = strip?.querySelector<HTMLElement>('[aria-current="date"]');
    if (!strip || !cell) return;
    const stripRect = strip.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const overLeft = stripRect.left + DATE_STRIP_KEEP_PAD - cellRect.left;
    const overRight = cellRect.right - (stripRect.right - DATE_STRIP_KEEP_PAD);
    const by = overLeft > 0 ? -overLeft : overRight > 0 ? overRight : 0;
    if (by !== 0) strip.scrollBy({ left: by, behavior: "smooth" });
  }, [stripRef, selected, monthKey]);
}
