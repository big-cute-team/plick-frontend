"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { SocialLoginActions } from "@/_components/SocialLoginActions";
import { PREDICTION_LINK_NOTICE } from "@/_constants/predictions";

/**
 * 예측 인증 실패와 게스트 제출 성공의 연동 안내. 성공 안내를 닫아도 저장한 예측은 유지한다.
 * @param mode `login`은 인증 실패, `link`는 권한 거절, `submitted`는 게스트 제출 성공
 * @param onClose 안내 닫기
 */
export function PredictionAuthDialog({
  mode,
  onClose,
}: {
  mode: "login" | "link" | "submitted";
  onClose: () => void;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
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
          {mode === "login"
            ? "로그인"
            : mode === "submitted"
              ? "예측이 등록됐어요"
              : PREDICTION_LINK_NOTICE}
        </p>
        {mode === "submitted" && (
          <p className="text-body text-text-3 mt-3 leading-relaxed">
            계정을 연동하고 예측 기록을 쌓아 보세요. 적중률과 시즌 랭킹도 확인할
            수 있어요.
          </p>
        )}
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
              {mode === "submitted" ? "나중에" : "취소"}
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
