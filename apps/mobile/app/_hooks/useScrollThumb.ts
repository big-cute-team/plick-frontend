"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * 가로 스크롤 상자의 보이는 비율과 지나온 비율을 재는 훅 (KAN-585). 스크롤 위치
 * 손잡이(바 위의 썸)를 그릴 때 쓴다.
 *
 * `size`는 전체 폭 중 지금 보이는 몫, `offset`은 전체 폭 중 왼쪽으로 지나간 몫이다.
 * 둘 다 0~1이고 끝까지 밀면 `offset + size`가 1이 된다. 썸 폭은 `size`, 썸 위치는
 * `offset`으로 그리면 된다.
 *
 * 서버에서는 잴 수 없으니 `initialSize`로 첫 렌더 모양을 받는다. 카드 수를 아는
 * 서버 컴포넌트가 "n장 중 두 장"을 넘겨 주면 하이드레이션 뒤 실측값과 거의 같아
 * 썸이 튀지 않는다. 폭이 바뀌면(회전, 폴드) ResizeObserver로 다시 잰다.
 *
 * @param scrollerRef 가로 스크롤 상자
 * @param initialSize 실측 전 보이는 몫(0~1). 기본 1(손잡이 없음)
 */
export function useScrollThumb(
  scrollerRef: RefObject<HTMLElement | null>,
  initialSize = 1,
) {
  const [thumb, setThumb] = useState({ size: initialSize, offset: 0 });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollWidth <= clientWidth) {
        setThumb({ size: 1, offset: 0 });
        return;
      }
      setThumb({
        size: clientWidth / scrollWidth,
        offset: Math.max(0, scrollLeft) / scrollWidth,
      });
    };

    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [scrollerRef]);

  return thumb;
}
