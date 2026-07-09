"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  TransitionEvent as ReactTransitionEvent,
} from "react";
import { DRAG_CLOSE_THRESHOLD } from "./sheet";

export interface ReelDetailMotion {
  /** 시트가 DOM에 있어야 하는가 (닫힘 애니메이션이 끝나면 false) */
  mounted: boolean;
  /** 올라온 상태인가 — false→true 전환이 슬라이드 업, 반대가 다운 */
  shown: boolean;
  /** 드래그 중 시트를 따라 내리는 오프셋(px) */
  dragY: number;
  dragging: boolean;
  open: () => void;
  requestClose: () => void;
  /** 그랩 존(기자 줄)에 스프레드할 포인터 핸들러 */
  grabProps: {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  onTransitionEnd: (e: ReactTransitionEvent<HTMLDivElement>) => void;
}

/**
 * 릴 세부 시트의 개폐·드래그 상태 머신.
 *
 * 시트(ReelDetailSheet)와 릴의 칩·제목(ReelItem)이 같은 상태로 transform을
 * 계산해야 한 몸으로 움직이므로, 상태를 부모(ReelsFeed)로 끌어올려 공유한다.
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

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (dragYRef.current > DRAG_CLOSE_THRESHOLD) setShown(false);
    dragYRef.current = 0;
    setDragY(0);
  }

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

  return {
    mounted,
    shown,
    dragY,
    dragging,
    open: () => setMounted(true),
    requestClose: () => setShown(false),
    grabProps,
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
