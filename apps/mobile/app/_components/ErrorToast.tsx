"use client";

import { useEffect } from "react";
import { ERROR_TOAST_DURATION_MS } from "@/_constants/feedback";
import { useErrorToast } from "@/_stores/error-toast";

/**
 * 전역 에러 토스트 (KAN-447) — 뮤테이션 전역 안전망이 잡은 실패를 하단에
 * 잠깐 띄운다. 루트 레이아웃에 한 번만 마운트한다.
 *
 * 모달(ErrorDialog)이 아니라 토스트인 이유: 좋아요처럼 가벼운 상호작용의
 * 실패에 확인 버튼을 세우는 건 과하다(useLikeToggle의 기존 판단). 대신
 * 아무 표시도 없던 상태는 없앤다 — 지나가는 한 줄이라도 실패를 알린다.
 */
export function ErrorToast() {
  const message = useErrorToast((state) => state.message);
  const seq = useErrorToast((state) => state.seq);
  const clear = useErrorToast((state) => state.clear);

  useEffect(() => {
    if (seq === 0) return;
    const timer = setTimeout(clear, ERROR_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [seq, clear]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-edge pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center"
    >
      <p className="bg-elevate border-border text-text rounded-pill text-label border px-4 py-2.5 text-center font-semibold">
        {message}
      </p>
    </div>
  );
}
