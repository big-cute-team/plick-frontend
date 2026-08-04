"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DRAG_CLOSE_THRESHOLD } from "@/_constants/reels";
import type { ReelDetailMotion } from "@/_types/reels";

/**
 * 릴 세부 시트의 개폐·드래그 상태 머신.
 *
 * 시트(ReelDetailSheet)와 릴의 칩·제목(ReelItem)이 같은 상태로 transform을
 * 계산해야 한 몸으로 움직이므로, 상태를 부모(ReelsFeed)로 끌어올려 공유한다.
 *
 * 끌어내리는 입구는 둘이다. 그랩 존(기자 줄)은 포인터 이벤트로 언제나 받고
 * (`grabProps`), 본문 스크롤 영역은 최상단에서 아래로 끄는 제스처만 시트
 * 드래그로 넘겨받는다(`scrollGrabRef`, KAN-358).
 */
export function useReelDetailMotion(): ReelDetailMotion {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  /* 이벤트 핸들러는 리렌더 전 stale state를 볼 수 있어 판정은 ref로 한다 */
  const draggingRef = useRef(false);
  const dragYRef = useRef(0);

  useEffect(() => {
    if (!mounted) return;
    /* 첫 페인트(translateY 100%) 이후에 shown을 켜야 transition이 재생된다 */
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (dragYRef.current > DRAG_CLOSE_THRESHOLD) setShown(false);
    dragYRef.current = 0;
    setDragY(0);
  }, []);

  const grabProps: ReelDetailMotion["grabProps"] = {
    onPointerDown: (e) => {
      startYRef.current = e.clientY;
      draggingRef.current = true;
      setDragging(true);
      /* 손가락이 그랩 존을 벗어나도 move/up을 계속 받도록 캡처 */
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if (!draggingRef.current) return;
      const dy = Math.max(0, e.clientY - startYRef.current);
      dragYRef.current = dy;
      setDragY(dy);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  const scrollCleanupRef = useRef<(() => void) | null>(null);

  /**
   * 본문 스크롤 영역에 다는 콜백 ref (KAN-358).
   *
   * 유튜브 쇼츠처럼, 목록이 최상단(scrollTop 0)일 때 아래로 끄는 제스처는 목록
   * 스크롤 대신 시트 드래그로 이어받는다. 판정은 제스처당 한 번 — 첫 이동에서
   * 위로 끌거나 이미 스크롤이 내려가 있으면 그 제스처는 끝까지 네이티브 스크롤에
   * 맡기고, 최상단에서 아래로 끌면 끝까지 시트를 따라 내린다.
   *
   * 포인터 이벤트가 아니라 네이티브 터치 리스너를 직접 다는 이유: 스크롤 가능한
   * 요소에서는 브라우저가 제스처를 스크롤(iOS 바운스 포함)로 가져가며
   * pointercancel을 쏴 드래그가 죽는다. 넘겨받기로 판정한 제스처는 touchmove에서
   * `preventDefault()`로 스크롤 자체를 막아야 하는데, React 합성 터치 핸들러는
   * passive로 붙어 preventDefault가 무시된다. 그래서 판정과 차단을 같은 네이티브
   * touchmove 안에서 한다 — 첫 이동 이벤트를 막지 못하면 브라우저가 이미 스크롤을
   * 시작해 늦는다.
   *
   * 마우스는 받지 않는다. 마우스 드래그는 스크롤을 일으키지 않아 충돌이 없고,
   * 본문 위에서 드래그는 텍스트 선택이 자연스럽다. 그랩 존이 마우스를 커버한다.
   */
  const scrollGrabRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
      if (!node) return;

      /** 이 제스처를 시트 드래그로 넘겨받았는지 — idle은 아직 판정 전 */
      let mode: "idle" | "sheet" | "scroll" = "idle";
      let startY = 0;

      const onTouchStart = (e: TouchEvent) => {
        const touch = e.touches[0];
        if (!touch) return;
        mode = "idle";
        startY = touch.clientY;
      };
      const onTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        if (!touch) return;
        const y = touch.clientY;
        if (mode === "idle") {
          const dy = y - startY;
          if (dy === 0) return;
          if (node.scrollTop > 0 || dy < 0) {
            mode = "scroll";
            return;
          }
          mode = "sheet";
          draggingRef.current = true;
          setDragging(true);
        }
        if (mode !== "sheet") return;
        e.preventDefault();
        const dy = Math.max(0, y - startY);
        dragYRef.current = dy;
        setDragY(dy);
      };
      const onTouchEnd = () => {
        if (mode === "sheet") endDrag();
        mode = "idle";
      };

      node.addEventListener("touchstart", onTouchStart, { passive: true });
      node.addEventListener("touchmove", onTouchMove, { passive: false });
      node.addEventListener("touchend", onTouchEnd);
      node.addEventListener("touchcancel", onTouchEnd);
      scrollCleanupRef.current = () => {
        node.removeEventListener("touchstart", onTouchStart);
        node.removeEventListener("touchmove", onTouchMove);
        node.removeEventListener("touchend", onTouchEnd);
        node.removeEventListener("touchcancel", onTouchEnd);
      };
    },
    [endDrag],
  );

  return {
    mounted,
    shown,
    dragY,
    dragging,
    open: () => setMounted(true),
    requestClose: () => setShown(false),
    grabProps,
    scrollGrabRef,
    onTransitionEnd: (e) => {
      if (
        e.target === e.currentTarget &&
        e.propertyName === "transform" &&
        !shown
      )
        setMounted(false);
    },
  };
}
