"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 확인 팝업 (KAN-333, 모바일 이식, 시안 KAN-567 다이얼로그) — 되돌리기 어려운
 * 동작(댓글 삭제, 차단 등) 앞에 한 번 묻는다. 시안: 가운데 304px 각진 상자
 * (`border-strong` + `shadow-dialog`), 제목 15/900 가운데, 설명 12.5 보조색,
 * 버튼 줄 38px에 테두리 "취소"와 빨간 채운 면 확정 버튼. 딤은 `dim-strong`이다.
 *
 * body로 포털을 뚫는 이유는 `LoginPromptDialog`와 같다 — 릴 세부 패널처럼
 * `transform`이 걸린 조상 안에서 띄우면 `fixed`의 기준 상자가 패널이 돼
 * 팝업이 그 조각만 덮는다.
 *
 * @param title - 카드 제목 (예: "댓글을 삭제할까요?")
 * @param description - 카드 본문 문구
 * @param confirmLabel - 확인 버튼 문구 (예: "삭제")
 * @param pending - 동작이 도는 동안 true — 버튼과 스크림 닫기를 잠가 연타를 막는다
 * @param error - 직전 시도의 실패 문구. 있으면 본문 밑에 보여주고 팝업은 열어 둬
 *   다시 시도할 수 있게 한다
 * @param onConfirm - 확인 버튼을 눌렀을 때
 * @param onClose - 취소 버튼 또는 스크림 클릭으로 닫을 때
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
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
      aria-labelledby="confirm-dialog-title"
    >
      {/* 딤 — 클릭하면 취소하고 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !pending && onClose()}
        className="bg-dim-strong absolute inset-0"
      />

      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-6 pb-5">
        <p
          id="confirm-dialog-title"
          className="text-body-lg text-text-strong text-center font-black"
        >
          {title}
        </p>
        <p className="text-label-lg text-text-3 mt-2 text-center leading-[1.6]">
          {description}
        </p>
        {error && (
          <p className="text-caption text-danger mt-2 text-center">{error}</p>
        )}

        <div className="mt-4.5 flex gap-2.25">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="border-border-strong text-text-2 text-body hover:bg-elevate focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center border font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="bg-danger text-on-accent text-body focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
