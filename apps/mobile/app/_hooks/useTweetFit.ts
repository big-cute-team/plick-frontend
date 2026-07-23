"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 트윗 카드를 박스 안에 통째로 맞추는 fit-scale (KAN-284, KAN-291).
 *
 * 카드가 박스보다 크면 transform scale로 전체를 축소한다. 사진은 항상
 * 포함하고(미디어 숨김 없음) 본문도 자르지 않는다 — X Display Requirements상
 * 본문 수정·말줄임이 금지라, 내용을 건드리지 않는 축소만 쓴다.
 *
 * 세로 정렬은 기본이 상단 밀착이고, centerRegion(박스 상단부터의 영역 높이,
 * px)이 주어지면 카드의 시각 높이가 그 영역보다 작을 때만 영역 세로 중앙으로
 * 내린다(offsetY). 영역보다 크면 상단 밀착 그대로다 — 릴스에서 짧은 트윗은
 * 칩 줄 위 영역 가운데에, 긴 트윗은 위에 붙여 스크림 뒤까지 흐르게 한다.
 *
 * 컨테이너·콘텐츠 양쪽을 ResizeObserver로 재서, 임베드 로딩으로 콘텐츠가
 * 자라거나 시트 개폐로 박스가 변하는(트랜지션 프레임 포함) 흐름을 모두
 * 따라간다.
 *
 * @param centerRegion 가운데 정렬 기준 영역의 높이(px). 생략하면 항상 상단 밀착.
 * @returns outerRef를 박스에, innerRef를 transform을 적용할 카드 래퍼에 단다.
 *   래퍼는 transform-origin이 top이어야 offsetY·scale이 계산과 일치한다.
 */
export function useTweetFit<
  TOuter extends HTMLElement,
  TInner extends HTMLElement,
>(centerRegion?: number) {
  const outerRef = useRef<TOuter>(null);
  const innerRef = useRef<TInner>(null);
  const [scale, setScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);

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

      const next = Math.min(1, boxW / innerW, boxH / innerH);
      setScale(next);

      const visualH = innerH * next;
      setOffsetY(
        centerRegion != null && visualH < centerRegion
          ? (centerRegion - visualH) / 2
          : 0,
      );
    }

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [centerRegion]);

  return { outerRef, innerRef, scale, offsetY };
}
