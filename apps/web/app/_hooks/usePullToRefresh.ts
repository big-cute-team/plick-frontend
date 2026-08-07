"use client";

import { useEffect, useRef, useState } from "react";
import {
  PULL_DIRECTION_SLOP,
  PULL_HOLD_DISTANCE,
  PULL_MIN_SPIN_MS,
  PULL_TRIGGER_DISTANCE,
  PULL_VIEWPORT_QUERY,
} from "@/_constants/pull-refresh";
import { dampPull } from "@/_utils/pull-refresh";

/**
 * 페이지 맨 위에서 아래로 당겨 새로고침하는 제스처 (KAN-379).
 *
 * 모바일 앱의 `usePullToRefresh`(KAN-314)를 이식했다. 결정적 차이 하나 — 모바일은
 * 셸이 뷰포트에 고정되고 내부 `ScrollArea` 엘리먼트가 스크롤하지만, 이 앱은
 * 문서(body) 자체가 스크롤한다. 그래서 리스너를 특정 엘리먼트가 아니라 window에
 * 걸고, 맨 위 판정도 `el.scrollTop`이 아니라 `window.scrollY`로 한다.
 *
 * 왜 직접 리스너를 다는가: React가 JSX의 `onTouchMove`를 passive로 걸기 때문에
 * 거기서는 `preventDefault()`가 무시된다. 기본 스크롤과 브라우저 자체 당겨서
 * 새로고침(리로드)을 막아야 우리가 콘텐츠를 대신 밀어 내릴 수 있으므로,
 * `{ passive: false }`로 직접 건다.
 *
 * 제스처 판정은 세 단계다. touchstart에서 문서가 맨 위였는지 보고(중간에서
 * 당기는 건 평범한 스크롤이다), 첫 {@link PULL_DIRECTION_SLOP}px 동안 방향을 재고,
 * 세로 성분이 가로보다 클 때만 당기기로 확정한다. 마지막 조건이 없으면 홈 맨 위의
 * 가로 캐러셀을 넘기다 손가락이 조금만 흘러내려도 새로고침이 걸린다.
 *
 * 뷰포트가 {@link PULL_VIEWPORT_QUERY}(lg 미만)일 때만 받는다 — 데스크톱
 * 터치스크린에서 당겨질 이유가 없고, transform이 lg 사이드바의 sticky를 깨는
 * 부작용도 피한다.
 *
 * @param onRefresh 갱신 동작. 이 프로미스가 끝나야 스피너가 멈춘다.
 *   없으면 훅 전체가 놀고, 제스처를 가로채지 않는다.
 * @returns `distance`는 콘텐츠를 밀어 내릴 거리(px), `dragging`은 손가락이
 *   닿아 있는지(애니메이션을 끌지 판단), `refreshing`은 갱신이 도는 중인지.
 */
export function usePullToRefresh(onRefresh?: () => Promise<unknown>) {
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** 리스너는 등록 시점에 굳으므로 최신 콜백은 ref로 건넨다 */
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const enabled = Boolean(onRefresh);

  useEffect(() => {
    if (!enabled) return;

    let startX = 0;
    let startY = 0;
    /** touchstart 때 맨 위 + 좁은 뷰포트였나 — 당기기로 볼 여지가 있는지 */
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
      armed =
        window.scrollY <= 0 && window.matchMedia(PULL_VIEWPORT_QUERY).matches;
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

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);

    return () => {
      alive = false;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);

  return { distance, dragging, refreshing };
}
