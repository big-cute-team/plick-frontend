"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SHEET_DISMISS_TRANSITION } from "@/_constants/sheet";
import { useSheetBackClose } from "@/_hooks/useSheetBackClose";
import { useSheetDismiss } from "@/_hooks/useSheetDismiss";

/**
 * 라이브 화면 공용 바텀시트. 딤 + 하단 패널(피그마 L10·L12·L13). 크롬은 시안
 * (KAN-567)의 `BottomSheet`와 같다. radius 26, 그랩 핸들, 진한 딤, 안쪽 패딩 20.
 * `BottomSheet`를 그대로 쓰지 않는 이유는 여기만 있는 두 동작 때문이다.
 *
 * 기존 시트·스크림 패턴을 뒤져 본 결과(ADR 0126 지침) `ReelDetailSheet`는
 * 릴스 제스처(드래그 개폐)에 결합돼 있고 다이얼로그류(`ShareDialog`)는 중앙
 * 배치라, ShareDialog의 body 포털 관용을 하단 정렬로 옮겨 새로 만들었다.
 *
 * 닫는 길이 스크림 탭 하나뿐이었는데 KAN-514에서 둘을 더 냈다. 아래로 쓸어
 * 내리면 시트가 손가락을 따라 내려가다 빠지고(`useSheetDismiss`), 시스템
 * 뒤로가기는 화면을 떠나는 대신 시트만 닫는다(`useSheetBackClose`). 뒤로가기가
 * 팀 프로필에서 통째로 빠져나가던 게 그 훅을 만든 이유다. 스탯 표가 길어 안에서
 * 스크롤하고 높이는 화면의 80%까지다.
 *
 * @param open 열림 여부(닫힘이면 아무것도 그리지 않는다)
 * @param onClose 스크림 탭·Escape 콜백
 * @param label 접근성용 시트 이름
 */
export function LiveSheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  /* SSR에는 document가 없어 마운트 후에만 포털을 연다 (ShareDialog 관용) */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panelRef = useRef<HTMLDivElement>(null);
  const { offset, dragging } = useSheetDismiss(panelRef, open, onClose);
  useSheetBackClose(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-80 flex items-end"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="bg-dim-strong absolute inset-0"
      />
      <div
        ref={panelRef}
        className="bg-bg rounded-t-sheet relative mx-auto max-h-[80dvh] w-full max-w-[480px] overflow-y-auto px-5 pt-5.5"
        style={{
          paddingBottom: "max(30px, var(--safe-bottom))",
          /* 끄는 동안은 전환을 끄고 손가락을 그대로 따라가고, 떼는 순간부터
             애니메이션으로 제자리에 돌아가거나 아래로 빠진다 */
          transform: offset > 0 ? `translateY(${offset}px)` : undefined,
          transition: dragging ? "none" : SHEET_DISMISS_TRANSITION,
        }}
      >
        <span
          aria-hidden
          className="bg-border-strong rounded-pill mx-auto mb-4.5 block h-1 w-9.5"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
