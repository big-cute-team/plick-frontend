"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 확인 팝업 (KAN-333) — 되돌리기 어려운 동작(댓글 삭제 등) 앞에 한 번 묻는다.
 * 로그아웃 확인 팝업(`LogoutButton`)과 같은 스크림 + 카드 + 두 버튼 관용이고,
 * 확인 쪽은 danger 톤이다.
 *
 * body로 포털을 뚫는 이유는 `LoginPromptDialog`와 같다 — 릴 세부 시트처럼
 * `transform`이 걸린 조상 안에서 띄우면 `fixed`의 기준 상자가 시트가 돼
 * 팝업이 그 조각만 덮는다.
 *
 * @param title - 카드 제목 (예: "댓글을 삭제할까요?")
 * @param description - 카드 본문 문구
 * @param confirmLabel - 확인 버튼 문구 (예: "삭제")
 * @param pending - 동작이 도는 동안 true — 버튼과 스크림 닫기를 잠가 연타를 막는다
 * @param error - 직전 시도의 실패 문구. 있으면 본문 밑에 보여주고 팝업은 열어 둬
 *   다시 시도할 수 있게 한다
 * @param onConfirm - 확인 버튼을 눌렀을 때
 * @param onClose - 취소 버튼 또는 스크림 탭으로 닫을 때
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
      {/* 스크림 — 탭하면 취소하고 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !pending && onClose()}
        className="absolute inset-0"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--plk-scrim) 60%, transparent)",
        }}
      />

      <div className="bg-bg border-border rounded-card relative w-full max-w-72 border p-6">
        <p
          id="confirm-dialog-title"
          className="text-body-lg text-text text-center font-extrabold"
        >
          {title}
        </p>
        <p className="text-label text-text-3 mt-2 text-center">{description}</p>
        {error && (
          <p className="text-caption text-danger mt-2 text-center">{error}</p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="border-border text-text-2 rounded-control text-body flex-1 border py-3 font-extrabold active:opacity-60 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="border-border-strong text-danger rounded-control text-body flex-1 border py-3 font-extrabold active:opacity-60 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
