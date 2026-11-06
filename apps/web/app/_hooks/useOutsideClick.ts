"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * 영역 밖을 눌렀을 때 콜백을 부른다 (KAN-737). 펼친 답글 영역을 다른 곳을 눌러 접는 데 쓴다.
 *
 * `pointerdown`이 아니라 `click`을 듣는다. 누르는 순간 접으면 영역 높이만큼 아래 내용이 올라와
 * 손을 떼는 자리가 다른 요소가 되고, 그러면 브라우저가 `click`을 원래 요소에 주지 않아 방금 누른
 * 버튼이 먹지 않는다.
 *
 * 밖으로 치지 않는 클릭이 둘 있다. 모달(`aria-modal`) 안의 클릭은 포털이라 DOM으로는 밖이지만
 * 영역에서 띄운 팝업이다. 처리 도중 DOM에서 빠진 요소의 클릭(수정 버튼이 폼으로 바뀌는 경우)은
 * 어디서 눌렸는지 알 수 없어 건너뛴다.
 *
 * @param ref 안쪽으로 칠 영역
 * @param onOutside 밖을 눌렀을 때 부를 콜백
 * @param enabled 켜져 있을 때만 듣는다
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  const callback = useRef(onOutside);

  // 콜백을 ref에 담아두면 매 렌더마다 리스너를 다시 달지 않아도 된다
  useEffect(() => {
    callback.current = onOutside;
  });

  useEffect(() => {
    if (!enabled) return;

    function onClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element) || !target.isConnected) return;
      if (ref.current?.contains(target)) return;
      if (target.closest('[aria-modal="true"]')) return;
      callback.current();
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [ref, enabled]);
}
