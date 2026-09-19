"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CloseIcon } from "@plick/ui/icons";

/**
 * 로그인 유도 팝업 (KAN-303) — 비로그인 사용자가 댓글 입력에 접근하거나 좋아요를
 * 누르려 할 때 띄운다. `ErrorDialog`와 같은 스크림 + 카드 관용에, 티켓 요구대로
 * 상단 X 닫기와 "로그인 하러 가기" 버튼을 둔다.
 *
 * body로 포털을 뚫는다(KAN-308). 이 팝업을 띄우는 자리가 릴 세부 시트 안(시트가
 * `translateY`로 오르내린다)이고 릴스 액션 레일 안(레일에 `drop-shadow` 필터가
 * 걸려 있다)인데, `transform`이나 `filter`가 걸린 조상은 `position: fixed`의 기준
 * 상자가 된다. 그 안에 두면 `inset-0`이 화면이 아니라 시트나 레일에 맞춰져 팝업이
 * 그 조각만 덮는다. body 밑으로 옮기면 어디서 부르든 화면 전체를 덮는다.
 *
 * @param onClose - X 버튼 또는 스크림 탭으로 닫을 때
 * @param description - 카드 본문 문구. 무엇을 하려다 막혔는지에 맞춰 넘긴다
 */
export function LoginPromptDialog({
  onClose,
  description = "댓글은 로그인한 사용자만 남길 수 있어요.",
}: {
  onClose: () => void;
  description?: string;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
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
        <p className="text-label text-text-3 mt-2 text-center">{description}</p>

        <Link
          href="/login"
          className="bg-accent text-on-accent rounded-control text-body mt-5 block w-full py-3 text-center font-extrabold active:opacity-60"
        >
          로그인 하러 가기
        </Link>
      </div>
    </div>,
    document.body,
  );
}
