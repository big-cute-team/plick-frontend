"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 트윗 카드가 박스를 벗어나면 미디어(사진)를 숨겨서 맞추는 크기 맞춤
 * (KAN-284 후속).
 *
 * X Display Requirements가 본문 수정·말줄임을 금지해서 텍스트는 건드리지
 * 않는다. 대신 카드가 박스보다 크면 사진을 빼고 전문을 그대로 보여준다.
 * 사진 없이도 안 들어가는 잔여분(세부 시트가 열려 박스가 27%로 줄어드는
 * 경우)만 transform scale로 축소한다 — 내용을 자르지 않는 안전망이다.
 *
 * 컨테이너·콘텐츠 양쪽을 ResizeObserver로 재서, 임베드 로딩으로 콘텐츠가
 * 자라거나 시트 개폐로 박스가 변하는(트랜지션 프레임 포함) 흐름을 모두
 * 따라간다. 미디어를 숨길 때의 카드 전체 높이를 기억해 두고, 박스가 그만큼
 * 다시 커지면 미디어를 복원한다.
 *
 * @returns outerRef를 박스에, innerRef를 scale을 적용할 카드 래퍼에 달고,
 *   hideMedia가 켜지면 호출부가 트윗 데이터에서 미디어를 뺀다.
 */
export function useTweetFit<
  TOuter extends HTMLElement,
  TInner extends HTMLElement,
>() {
  const outerRef = useRef<TOuter>(null);
  const innerRef = useRef<TInner>(null);
  const [scale, setScale] = useState(1);
  const [hideMedia, setHideMedia] = useState(false);
  /* RO 콜백은 리렌더 전 stale state를 볼 수 있어 판정은 ref로 한다 */
  const hideMediaRef = useRef(false);
  /** 미디어를 숨기기 직전의 카드 전체 높이 — 복원 판정 기준 */
  const fullHeightRef = useRef(0);

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

      if (!hideMediaRef.current && innerH > boxH) {
        fullHeightRef.current = innerH;
        hideMediaRef.current = true;
        setHideMedia(true);
        /* 미디어가 빠진 크기는 리렌더 후 RO가 다시 재서 scale을 잡는다 */
      } else if (hideMediaRef.current && boxH >= fullHeightRef.current) {
        hideMediaRef.current = false;
        setHideMedia(false);
      }

      setScale(Math.min(1, boxW / innerW, boxH / innerH));
    }

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return { outerRef, innerRef, scale, hideMedia };
}
