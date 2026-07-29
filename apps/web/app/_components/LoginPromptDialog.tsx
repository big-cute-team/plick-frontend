"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CloseIcon } from "@plick/ui/icons";

/**
 * 로그인 유도 팝업 (KAN-303, web 이식 KAN-329) — 비로그인 사용자가 댓글 입력에
 * 접근할 때 띄운다. `ErrorDialog`와 같은 스크림 + 카드 관용에, 상단 X 닫기와
 * "로그인 하러 가기" 버튼을 둔다. 데스크톱이라 hover·focus-visible을 얹었다.
 *
 * body로 포털을 뚫는다. 릴 세부 패널 안에서도 이 팝업을 띄우는데 그 패널은
 * `translateX`로 미끄러지고, `transform`이 걸린 조상은 `position: fixed`의 기준
 * 상자가 된다. 그 안에 두면 `inset-0`이 화면이 아니라 패널에 맞춰져 팝업이 패널만
 * 덮는다. body 밑으로 옮기면 어디서 부르든 화면 전체를 덮는다.
 *
 * @param onClose - X 버튼 또는 스크림 클릭으로 닫을 때
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
      {/* 스크림 — 클릭하면 닫는다 */}
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
          className="text-icon hover:bg-elevate focus-visible:outline-accent absolute top-3 right-3 flex size-8.5 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
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
          className="bg-accent text-on-accent rounded-control text-body focus-visible:outline-accent mt-5 block w-full py-3 text-center font-extrabold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          로그인 하러 가기
        </Link>
      </div>
    </div>,
    document.body,
  );
}
