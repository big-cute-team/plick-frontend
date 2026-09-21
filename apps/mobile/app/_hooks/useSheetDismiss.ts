"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  SHEET_DIRECTION_SLOP,
  SHEET_DISMISS_DISTANCE,
  SHEET_DISMISS_MS,
} from "@/_constants/sheet";

/**
 * 바텀시트를 아래로 쓸어 닫는 제스처 (KAN-514).
 *
 * 스크림을 정확히 눌러야만 닫히던 시트에 손버릇대로 닫는 길을 낸다. 시트를
 * 아래로 끌면 손가락을 그대로 따라 내려오고, 문턱({@link SHEET_DISMISS_DISTANCE})을
 * 넘겨 놓으면 화면 밖까지 미끄러져 나간 뒤 닫힌다. 문턱을 못 넘기면 제자리로
 * 돌아간다.
 *
 * 리스너를 JSX가 아니라 엘리먼트에 직접 거는 이유는 `usePullToRefresh`와 같다 —
 * React는 `onTouchMove`를 루트에 passive로 걸어서 거기서는 `preventDefault()`가
 * 무시된다. 기본 스크롤을 막아야 우리가 시트를 대신 밀어 내릴 수 있다.
 *
 * 제스처 판정도 같은 3단계다. 시트 안이 맨 위였는지 보고(중간에서 끄는 건
 * 평범한 스크롤이다), 첫 {@link SHEET_DIRECTION_SLOP}px 동안 방향을 재고, 아래쪽
 * 세로 성분이 가로보다 클 때만 닫기로 확정한다. 마지막 조건이 없으면 표를 옆으로
 * 훑다가도 시트가 닫힌다.
 *
 * 닫기를 곧바로 부르지 않고 시트 높이만큼 내려보낸 뒤 부르는 건, 시트가
 * 언마운트로 사라져서다. 즉시 부르면 손을 뗀 자리에서 툭 사라져 내려가는 동작이
 * 안 보인다. 전환이 끝날 시간을 준 뒤 닫는다.
 *
 * @param ref 시트 패널 엘리먼트(스크롤되는 그 상자)
 * @param open 시트가 열려 있는가. 닫히면 리스너를 걷는다
 * @param onClose 닫기 콜백
 * @returns `offset`은 시트를 내릴 거리(px), `dragging`은 손가락이 닿아 있는지
 *   (애니메이션을 끌지 판단)
 */
export function useSheetDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): { offset: number; dragging: boolean } {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  /** 리스너는 등록 시점에 굳으므로 최신 콜백은 ref로 건넨다 */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el || !open) return;

    /* 다시 열렸다면 지난 제스처의 잔상을 지운다 */
    setOffset(0);

    let startX = 0;
    let startY = 0;
    /** touchstart 때 시트 안이 맨 위였나 — 닫기로 볼 여지가 있는지 */
    let armed = false;
    /** 방향 판정을 통과해 실제로 끌고 있는가 */
    let pulling = false;
    let current = 0;
    /** 닫히는 중 — 새 제스처를 받지 않는다 */
    let closing = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (closing || e.touches.length !== 1 || !touch) {
        armed = false;
        return;
      }
      armed = el.scrollTop <= 0;
      startX = touch.clientX;
      startY = touch.clientY;
      current = 0;
    };

    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!armed || !touch) return;
      const dy = touch.clientY - startY;
      const dx = touch.clientX - startX;

      if (!pulling) {
        if (
          Math.abs(dy) < SHEET_DIRECTION_SLOP &&
          Math.abs(dx) < SHEET_DIRECTION_SLOP
        ) {
          return;
        }
        // 위로 끄는 건 시트 안 스크롤이고, 가로가 더 크면 표를 훑는 손짓이다
        if (dy <= 0 || Math.abs(dy) <= Math.abs(dx)) {
          armed = false;
          return;
        }
        pulling = true;
        setDragging(true);
      }

      e.preventDefault();
      current = Math.max(0, dy);
      setOffset(current);
    };

    const onEnd = () => {
      armed = false;
      if (!pulling) return;
      pulling = false;
      setDragging(false);

      if (current < SHEET_DISMISS_DISTANCE) {
        current = 0;
        setOffset(0);
        return;
      }
      closing = true;
      setOffset(el.getBoundingClientRect().height);
      timer = setTimeout(() => closeRef.current(), SHEET_DISMISS_MS);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);

    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, open]);

  return { offset, dragging };
}
