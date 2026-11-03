"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * 가운데 팝업 껍데기 (KAN-711). 사용자가 부른 확인 행동은 `BottomSheet`가 맡고(시안 규칙,
 * KAN-567), 서비스가 먼저 거는 안내(앱 다운로드)는 이 팝업이다. 가운데 카드가 시선을 바로
 * 받고 폴드·태블릿처럼 넓은 화면에서도 아래에 넓적하게 깔리지 않는다.
 *
 * 포털·딤·Escape는 `BottomSheet`와 같은 이유로 같은 구조다. 상단바의 `backdrop-blur` 같은
 * 조상 filter가 `fixed`의 기준 상자를 바꾸므로 body로 뚫고, 딤을 누르면 닫는다. 카드 폭은
 * 화면 좌우 `px-edge`를 남기고 최대 20rem이다. 세로는 내용만큼만 차지해 본문이 위아래로
 * 보인다(구글이 본문을 덮는 인터스티셜을 감점한다).
 *
 * @param onClose - 딤 탭·Escape에 호출
 * @param label - 팝업의 접근성 이름
 * @param className - 카드 안쪽 패딩을 바꿀 때
 */
export function PopupDialog({
  onClose,
  label,
  className = "px-6 pt-7 pb-5",
  children,
}: {
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="px-edge fixed inset-0 z-80 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="bg-dim-strong absolute inset-0"
      />
      <div
        className={`bg-bg rounded-hero relative w-full max-w-[20rem] ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
