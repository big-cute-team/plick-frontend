"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * 확인이 필요한 행동의 바텀 시트 (KAN-567). 시안 규칙대로 팝업이 아니라 아래에서
 * 올라오는 시트(radius 26, 그랩 핸들, 딤)다. 신고·차단·완료·로그인 안내·공유·삭제
 * 확인이 전부 이 껍데기 위에 내용만 얹는다.
 *
 * body로 포털을 뚫는다 — 상단바의 `backdrop-blur`처럼 조상에 filter가 걸리면
 * `fixed`의 기준 상자가 그 조상이 돼 화면 전체를 못 덮는다(TopBarMenu와 같은 이유).
 * 앱 셸이 480px로 중앙 정렬되는 넓은 화면에서도 시트가 셸 폭에 맞게 서도록
 * 같은 max-w를 준다. 딤을 누르면 닫힌다.
 *
 * @param onClose - 딤 탭·Escape에 호출. `locked`면 무시한다(요청 진행 중)
 * @param label - 시트의 접근성 이름
 * @param locked - 요청 진행 중 등 닫으면 안 되는 상태
 * @param className - 시트 안쪽 패딩을 바꿀 때
 */
export function BottomSheet({
  onClose,
  label,
  locked = false,
  className = "px-5 pt-5.5 pb-7.5",
  children,
}: {
  onClose: () => void;
  label: string;
  locked?: boolean;
  className?: string;
  children: ReactNode;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mounted, locked, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-80 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !locked && onClose()}
        className="bg-dim-strong absolute inset-0"
      />
      <div
        className={`bg-bg rounded-t-sheet relative mx-auto w-full max-w-[480px] ${className}`}
        style={{ paddingBottom: "max(30px, var(--safe-bottom))" }}
      >
        <div
          aria-hidden
          className="bg-border-strong rounded-pill mx-auto mb-4.5 h-1 w-9.5"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * 시트 하단의 버튼 줄 — 왼쪽 취소(테두리 텍스트 버튼), 오른쪽 확정(채운 면).
 * 시안의 신고·차단 시트가 같은 줄이다. 확정 버튼은 위험한 행동(신고·차단·삭제)이면
 * 빨강, 그 외(확인)는 강조색이다.
 *
 * @param confirmLabel - 확정 버튼 문구
 * @param tone - `danger`(신고·차단·삭제·탈퇴) 또는 `accent`(확인)
 * @param disabled - 확정 버튼 비활성(사유 미선택). 톤을 낮춰 그린다
 * @param pending - 요청 진행 중 — 양쪽 다 잠근다
 */
export function SheetActions({
  onCancel,
  onConfirm,
  confirmLabel,
  tone = "danger",
  disabled = false,
  pending = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  tone?: "danger" | "accent";
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="mt-4.5 flex gap-2.25">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="border-border-strong text-text-2 rounded-control text-body-md flex h-12 flex-1 items-center justify-center border font-bold active:opacity-60 disabled:opacity-40"
      >
        취소
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled || pending}
        className={`rounded-control text-body-md text-on-accent flex h-12 flex-1 items-center justify-center font-bold active:opacity-60 disabled:opacity-35 ${
          tone === "danger" ? "bg-danger" : "bg-accent"
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

/**
 * 완료 상태 시트 본문 — 가운데 정렬 제목·설명 + 확인 버튼 하나. 신고 접수, 차단 완료가 쓴다.
 */
export function SheetDone({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <>
      <p className="text-title text-text-strong tracking-heading text-center font-black">
        {title}
      </p>
      <p className="text-body text-text-3 mt-2 text-center leading-relaxed">
        {description}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="bg-accent text-on-accent rounded-control text-body-md mt-5 flex h-12 w-full items-center justify-center font-bold active:opacity-60"
      >
        확인
      </button>
    </>
  );
}
