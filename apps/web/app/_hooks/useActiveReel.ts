"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 이 비율 이상 화면을 차지하면 지금 보고 있는 릴로 본다. */
const ACTIVE_RATIO = 0.6;

/**
 * 스냅 뷰어에서 지금 보고 있는 릴의 인덱스 (KAN-323).
 *
 * 릴 한 장이 뷰어를 통째로 채우는데 CSS scroll-snap은 "몇 번째에 붙었는지"를
 * 알려주지 않는다(모바일은 Embla가 알려준다). 그래서 각 릴을
 * `IntersectionObserver`로 관찰해 화면을 {@link ACTIVE_RATIO} 이상 차지하는
 * 릴을 활성으로 잡는다. 스크롤 이벤트로 좌표를 재는 것과 달리 브라우저가 교차
 * 상태가 바뀔 때만 알려줘 스크롤 한 번에 수십 번 계산하지 않는다.
 *
 * 인덱스를 ref 콜백 인자로 받지 않고 `data-reel-index`에서 읽는 이유는, 인덱스를
 * 클로저로 묶으면 릴마다 매 렌더 새 콜백이 생겨 React가 ref를 떼었다 붙이며
 * 관찰을 다시 걸기 때문이다. 콜백 하나를 고정해 두고 인덱스는 DOM에서 읽는다.
 *
 * @returns 지금 보고 있는 릴 인덱스와, 각 릴 요소에 달 ref 콜백
 */
export function useActiveReel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const observer = observerRef.current;
    return () => observer?.disconnect();
  }, []);

  const registerReel = useCallback((el: HTMLElement | null) => {
    if (!el) return;

    observerRef.current ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < ACTIVE_RATIO) continue;
          const index = Number(
            (entry.target as HTMLElement).dataset.reelIndex ?? NaN,
          );
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      },
      { threshold: ACTIVE_RATIO },
    );

    const observer = observerRef.current;
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return { activeIndex, registerReel };
}
