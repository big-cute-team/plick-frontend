"use client";

import Link from "next/link";
import { CloseIcon } from "@plick/ui/icons";

/**
 * 로그인 유도 팝업 (KAN-303) — 비로그인 사용자가 댓글 입력에 접근하거나
 * 제출하려 할 때 띄운다. `ErrorDialog`와 같은 스크림 + 카드 관용에,
 * 티켓 요구대로 상단 X 닫기와 "로그인 하러 가기" 버튼을 둔다.
 *
 * @param onClose - X 버튼 또는 스크림 탭으로 닫을 때
 */
export function LoginPromptDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
    >
      {/* 스크림 — 탭하면 닫는다 */}
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

      <div className="bg-bg border-border rounded-card relative w-full max-w-72 border p-6">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="text-icon absolute top-3 right-3 flex size-8.5 items-center justify-center active:opacity-60"
        >
          <CloseIcon size={18} />
        </button>

        <p
          id="login-prompt-title"
          className="text-body-lg text-text pt-2 text-center font-extrabold"
        >
          로그인이 필요해요
        </p>
        <p className="text-label text-text-3 mt-2 text-center">
          댓글은 로그인한 사용자만 남길 수 있어요.
        </p>

        <Link
          href="/login"
          className="bg-accent text-on-accent rounded-control text-body mt-5 block w-full py-3 text-center font-extrabold active:opacity-60"
        >
          로그인 하러 가기
        </Link>
      </div>
    </div>
  );
}
