"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 트윗 카드를 박스 안에 통째로 맞추는 fit-scale (KAN-284, KAN-291).
 *
 * 카드가 박스보다 크면 transform scale로 전체를 축소한다. 사진은 항상
 * 포함하고(미디어 숨김 없음) 본문도 자르지 않는다 — X Display Requirements상
 * 본문 수정·말줄임이 금지라, 내용을 건드리지 않는 축소만 쓴다.
 *
 * 컨테이너·콘텐츠 양쪽을 ResizeObserver로 재서, 임베드 로딩으로 콘텐츠가
 * 자라거나 시트 개폐로 박스가 변하는(트랜지션 프레임 포함) 흐름을 모두
 * 따라간다.
 *
 * @returns outerRef를 박스에, innerRef를 scale을 적용할 카드 래퍼에 단다.
 */
export function useTweetFit<
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
      const boxW = outer!.clientWidth;
      const boxH = outer!.clientHeight;
      /* transform은 offset 치수에 안 잡히므로 scale 적용 전 원본 크기가 재진다 */
      const innerW = inner!.offsetWidth;
      const innerH = inner!.offsetHeight;
      if (!boxW || !boxH || !innerW || !innerH) return;

      setScale(Math.min(1, boxW / innerW, boxH / innerH));
    }

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return { outerRef, innerRef, scale };
}
