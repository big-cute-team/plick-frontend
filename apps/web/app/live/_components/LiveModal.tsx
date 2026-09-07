"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@plick/ui/icons";

/**
 * 라이브 화면 공용 센터 모달(피그마 LW7) — 모바일의 바텀시트 지면을
 * 데스크톱에선 중앙 다이얼로그로 바꾼다. `ShareDialog`의 body 포털·스크림
 * 관용을 따르되 닫기 버튼과 hover 상태를 더했다.
 *
 * @param open - 열림 여부
 * @param onClose - 스크림 클릭·닫기 버튼·Escape 콜백
 * @param label - 접근성용 다이얼로그 이름
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
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--plk-scrim) 60%, transparent)",
        }}
      />
      <div className="bg-nav border-border rounded-card max-w-auth relative max-h-[85dvh] w-full overflow-y-auto border p-6">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="text-text-4 hover:text-text rounded-control absolute top-4 right-4 grid size-8 place-items-center transition-colors"
        >
          <CloseIcon size={16} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
