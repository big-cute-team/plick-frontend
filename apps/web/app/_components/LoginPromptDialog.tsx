"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

/**
 * 로그인 유도 팝업 (KAN-303, web 이식 KAN-329, 시안 KAN-567 다이얼로그) — 비로그인
 * 사용자가 댓글·좋아요·투표에 손대면 띄운다. `ConfirmDialog`와 같은 각진 상자에
 * 테두리 "취소"와 강조색 채운 면 "로그인 하러 가기"를 둔다. 상단 X는 시안
 * 다이얼로그에 없어 뺐다.
 *
 * body로 포털을 뚫는다. 릴 세부 패널 안에서도 이 팝업을 띄우는데 그 패널은
 * `translateX`로 미끄러지고, `transform`이 걸린 조상은 `position: fixed`의 기준
 * 상자가 된다. 그 안에 두면 `inset-0`이 화면이 아니라 패널에 맞춰져 팝업이 패널만
 * 덮는다. body 밑으로 옮기면 어디서 부르든 화면 전체를 덮는다.
 *
 * @param onClose - 취소 버튼 또는 딤 클릭으로 닫을 때
 * @param description - 카드 본문 문구. 무엇을 하려다 막혔는지에 맞춰 넘긴다
 */
export function LoginPromptDialog({
  onClose,
  description = "댓글은 로그인한 사용자만 남길 수 있어요",
}: {
  onClose: () => void;
  description?: string;
}) {
  const { isGuest } = useAuth();

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
      {/* 딤 — 클릭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="bg-dim-strong absolute inset-0"
      />

      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-6 pb-5">
        <p
          id="login-prompt-title"
          className="text-body-lg text-text-strong text-center font-black"
        >
          {isGuest ? "계정 연동이 필요해요" : "로그인이 필요해요"}
        </p>
        <p className="text-label-lg text-text-3 mt-2 text-center leading-[1.6]">
          {isGuest
            ? "댓글과 신고, 채팅은 소셜 계정을 연동해야 쓸 수 있어요. 지금까지 기록은 그대로 이어져요"
            : description}
        </p>

        <div className="mt-4.5 flex gap-2.25">
          <button
            type="button"
            onClick={onClose}
            className="border-border-strong text-text-2 text-body hover:bg-elevate focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center border font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            취소
          </button>
          <Link
            href="/login"
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {isGuest ? "계정 연동하러 가기" : "로그인 하러 가기"}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
