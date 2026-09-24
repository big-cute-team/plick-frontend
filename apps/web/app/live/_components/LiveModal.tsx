"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@plick/ui/icons";

/**
 * 라이브 화면 공용 센터 다이얼로그 — 모바일의 바텀시트 지면을 데스크톱에선 중앙
 * 상자로 바꾼다. 시안(KAN-567 웹 1434-1495행)의 각진 다이얼로그 톤이다. 폭 304px,
 * 레일 테두리(`border-border-strong`), `shadow-dialog`, 딤은 `bg-dim`. `ShareDialog`의
 * body 포털, 스크림 관용을 따르되 닫기 버튼과 hover 상태를 더했다.
 *
 * @param open 열림 여부
 * @param onClose 스크림 클릭, 닫기 버튼, Escape 콜백
 * @param label 접근성용 다이얼로그 이름
 */
export function LiveModal({
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="bg-dim absolute inset-0"
      />
      <div className="bg-bg border-border-strong shadow-dialog relative max-h-[85dvh] w-full max-w-76 overflow-y-auto border p-5">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="text-text-3 hover:text-text-strong absolute top-3 right-3 grid size-7 place-items-center transition-colors"
        >
          <CloseIcon size={14} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
