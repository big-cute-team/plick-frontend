"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { SocialLoginActions } from "@/_components/SocialLoginActions";
import { PREDICTION_LINK_NOTICE } from "@/_constants/predictions";

/**
 * 예측 작성의 로그인·연동 팝업 (KAN-696, 시안 가이드 §5.5 로그인 분기). 비로그인은 `로그인` 제목
 * 아래 소셜 버튼이 바로 서고, 게스트는 `계정 연동 후 예측할 수 있어요`에 취소와 연동하기다.
 * 댓글의 `LoginPromptDialog`는 안내 뒤 로그인 화면으로 보내는 두 단계인데 시안은 팝업에서 소셜
 * 버튼을 바로 누르게 그려 따로 둔다. 가이드는 웹 게스트를 "해당 없음"으로 두지만 웹에도 게스트
 * 세션이 있어(KAN-514) 같은 안내를 둔다.
 *
 * 소셜 로그인은 OAuth 인가 페이지로 나가는 하드 내비게이션이라 돌아오면 이 화면 상태가 없다.
 * 고른 픽과 쓰던 글은 작성 팝업이 경기별 임시 저장에 적어 두어 다시 작성을 누르면 살아난다.
 * body 포털 이유는 `ConfirmDialog`와 같다.
 *
 * @param mode `login`은 비로그인, `link`는 게스트
 * @param onClose 팝업 닫기
 */
export function PredictionAuthDialog({
  mode,
  onClose,
}: {
  mode: "login" | "link";
  onClose: () => void;
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
      aria-labelledby="prediction-auth-title"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="bg-dim-strong absolute inset-0"
      />
      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-6 pb-5">
        <p
          id="prediction-auth-title"
          className="text-body-lg text-text-strong text-center font-bold"
        >
          {mode === "login" ? "로그인" : PREDICTION_LINK_NOTICE}
        </p>
        {mode === "login" ? (
          <div className="mt-4 flex flex-col gap-2">
            <SocialLoginActions
              kakaoLabel="카카오로 계속"
              googleLabel="구글로 계속"
              appleLabel="Apple로 계속"
            />
          </div>
        ) : (
          <div className="mt-4.5 flex gap-2.25">
            <button
              type="button"
              onClick={onClose}
              className="bg-chip text-text-2 text-body hover:bg-border-strong focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              취소
            </button>
            <Link
              href="/login"
              className="bg-text-strong text-on-accent text-body focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              연동하기
            </Link>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
