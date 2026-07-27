"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  PULL_DIRECTION_SLOP,
  PULL_HOLD_DISTANCE,
  PULL_MIN_SPIN_MS,
  PULL_TRIGGER_DISTANCE,
} from "@/_constants/pull-refresh";
import { dampPull } from "@/_utils/pull-refresh";

/**
 * 목록 맨 위에서 아래로 당겨 새로고침하는 제스처 (KAN-314).
 *
 * 유튜브·인스타그램과 같은 감각을 목표로 했다. 맨 위에서 당기면 콘텐츠가 손가락을
 * 따라 내려오다 점점 뻑뻑해지고, 문턱을 넘겨 놓으면 스피너가 도는 자리에 잠깐
 * 멈췄다가 갱신이 끝나면 제자리로 올라간다.
 *
 * 왜 직접 리스너를 다는가: React가 JSX의 `onTouchMove`를 루트에 passive로 걸기
 * 때문에 거기서는 `preventDefault()`가 무시된다. 기본 스크롤과 iOS 고무줄 반동을
 * 막아야 우리가 콘텐츠를 대신 밀어 내릴 수 있으므로, 엘리먼트에 직접
 * `{ passive: false }`로 건다.
 *
 * 제스처 판정은 세 단계다. touchstart에서 스크롤이 맨 위였는지 보고(중간에서
 * 당기는 건 평범한 스크롤이다), 첫 {@link PULL_DIRECTION_SLOP}px 동안 방향을 재고,
 * 세로 성분이 가로보다 클 때만 당기기로 확정한다. 마지막 조건이 없으면 홈 맨 위의
 * 가로 캐러셀을 넘기다 손가락이 조금만 흘러내려도 새로고침이 걸린다.
 *
 * @param ref 스크롤되는 엘리먼트
 * @param onRefresh 갱신 동작. 이 프로미스가 끝나야 스피너가 멈춘다.
 *   없으면 훅 전체가 놀고, 제스처를 가로채지 않는다.
 * @returns `distance`는 콘텐츠를 밀어 내릴 거리(px), `dragging`은 손가락이
 *   닿아 있는지(애니메이션을 끌지 판단), `refreshing`은 갱신이 도는 중인지.
 */
export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  onRefresh?: () => Promise<unknown>,
) {
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** 리스너는 등록 시점에 굳으므로 최신 콜백은 ref로 건넨다 */
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const enabled = Boolean(onRefresh);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    /** touchstart 때 맨 위였나 — 이 제스처를 당기기로 볼 여지가 있는지 */
    let armed = false;
    /** 방향 판정을 통과해 실제로 당기는 중인가 */
    let pulling = false;
    let current = 0;
    let busy = false;
    let alive = true;

    const reset = () => {
      pulling = false;
      armed = false;
      current = 0;
      setDragging(false);
      setDistance(0);
    };

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (busy || e.touches.length !== 1 || !touch) {
        armed = false;
        return;
      }
      armed = el.scrollTop <= 0;
      startX = touch.clientX;
      startY = touch.clientY;
      current = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!armed || busy) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!pulling) {
        // 아직 방향을 못 정했다 — 조금 더 움직일 때까지 브라우저에 맡겨 둔다
        if (
          Math.abs(dx) < PULL_DIRECTION_SLOP &&
          Math.abs(dy) < PULL_DIRECTION_SLOP
        ) {
          return;
        }
        // 가로로 넘기는 중이거나 위로 올리는 중이면 이 제스처는 우리 것이 아니다
        if (dy <= Math.abs(dx)) {
          armed = false;
          return;
        }
        pulling = true;
        // 방향을 재느라 쓴 슬롭은 빼고 여기서부터 거리를 잰다 — 안 그러면
        // 당기기 시작하는 순간 콘텐츠가 슬롭만큼 툭 튄다
        startY = touch.clientY;
        setDragging(true);
        return;
      }

      e.preventDefault();
      current = dampPull(dy);
      setDistance(current);
    };

    const onEnd = () => {
      if (!pulling) {
        armed = false;
        return;
      }
      if (current < PULL_TRIGGER_DISTANCE) {
        reset();
        return;
      }

      pulling = false;
      armed = false;
      busy = true;
      setDragging(false);
      setRefreshing(true);
      setDistance(PULL_HOLD_DISTANCE);

      void Promise.all([
        refreshRef.current?.(),
        new Promise((resolve) => setTimeout(resolve, PULL_MIN_SPIN_MS)),
      ]).finally(() => {
        busy = false;
        current = 0;
        if (!alive) return;
        setRefreshing(false);
        setDistance(0);
      });
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);

    return () => {
      alive = false;
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, enabled]);

  return { distance, dragging, refreshing };
}
