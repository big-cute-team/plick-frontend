"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * 라이브 화면 공용 바텀시트 — 스크림 + 하단 패널(피그마 L10·L12·L13).
 *
 * 기존 시트·스크림 패턴을 뒤져 본 결과(ADR 0126 지침) `ReelDetailSheet`는
 * 릴스 제스처(드래그 개폐)에 결합돼 있고 다이얼로그류(`ShareDialog`)는 중앙
 * 배치라, 하단 고정 + 탭 닫기만 필요한 이 지면엔 ShareDialog의 body 포털
 * 관용을 하단 정렬로 옮겨 새로 만들었다. 드래그 개폐는 껍데기 범위 밖이다.
 *
 * @param open - 열림 여부(닫힘이면 아무것도 그리지 않는다)
 * @param onClose - 스크림 탭·Escape 콜백
 * @param label - 접근성용 시트 이름
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
      className="fixed inset-0 z-50 flex items-end"
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
      <div
        className="bg-bg rounded-t-sheet px-edge relative mx-auto max-h-[80dvh] w-full max-w-[480px] overflow-y-auto pt-3"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 28px)" }}
      >
        <span
          aria-hidden
          className="bg-border rounded-pill mx-auto mb-4 block h-1 w-9"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
