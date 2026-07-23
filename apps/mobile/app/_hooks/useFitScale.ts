"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 콘텐츠를 컨테이너 안에 들어가게 축소하는 scale 값을 계산한다 (KAN-284).
 *
 * 트윗 임베드처럼 자연 높이가 콘텐츠에 따라 유동인 요소를 고정 크기 사진 자리에
 * 넣을 때 쓴다. 두 요소를 ResizeObserver로 재서 `min(1, 가로비, 세로비)`를 유지
 * 한다 — 임베드 로딩으로 콘텐츠가 자라거나, 릴 세부 시트가 열려 컨테이너가
 * 줄어드는(트랜지션 프레임 포함) 양쪽 변화를 모두 따라간다. 확대는 하지 않는다.
 *
 * @returns outerRef를 컨테이너에, innerRef를 scale을 적용할 콘텐츠 래퍼에 단다.
 */
export function useFitScale<
  TOuter extends HTMLElement,
  TInner extends HTMLElement,
>() {
  const outerRef = useRef<TOuter>(null);
  const innerRef = useRef<TInner>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function update() {
      /* transform은 offset 치수에 안 잡히므로 scale 적용 전 원본 크기가 재진다 */
      const innerW = inner!.offsetWidth;
      const innerH = inner!.offsetHeight;
      if (!innerW || !innerH) return;
      setScale(
        Math.min(1, outer!.clientWidth / innerW, outer!.clientHeight / innerH),
      );
    }

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return { outerRef, innerRef, scale };
}
