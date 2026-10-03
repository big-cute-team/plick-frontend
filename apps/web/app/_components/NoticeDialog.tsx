"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 안내 팝업 (KAN-567, 시안 "차단했어요" 다이얼로그) — 제목, 설명, 강조색 채운 면
 * "확인" 하나. 신고 접수·차단 완료처럼 결과만 알리고 닫는 자리다. 모양은
 * `ConfirmDialog`와 같은 각진 상자이고 버튼만 하나다.
 *
 * `ErrorDialog`가 비슷하지만 제목이 "저장할 수 없어요"로 굳어 있고 테두리 버튼이라
 * 완료 안내에는 맞지 않아 따로 뒀다. body 포털 이유는 `ConfirmDialog`와 같다.
 *
 * @param title - 카드 제목 (예: "OOO님을 차단했어요")
 * @param description - 카드 본문 문구
 * @param onClose - "확인" 또는 딤 클릭으로 닫을 때
 */
export function NoticeDialog({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="notice-dialog-title"
    >
      {/* 딤 — 클릭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="bg-dim-strong absolute inset-0"
      />

      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-6 pb-5">
        <p
          id="notice-dialog-title"
          className="text-body-lg text-text-strong text-center font-black"
        >
          {title}
        </p>
        <p className="text-label-lg text-text-3 mt-2 text-center leading-[1.6]">
          {description}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4.5 flex h-9.5 w-full items-center justify-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          확인
        </button>
      </div>
    </div>,
    document.body,
  );
}
