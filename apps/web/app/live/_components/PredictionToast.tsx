"use client";

import { useEffect } from "react";
import { ERROR_TOAST_DURATION_MS } from "@/_constants/feedback";

/**
 * 예측 탭의 한 줄 토스트 (KAN-696). `방금 마감됐어요`처럼 지나가는 안내를 하단에 잠깐 띄운다.
 * 웹은 모바일의 전역 에러 토스트 스토어(KAN-447)가 없어 탭이 메시지와 일련번호를 들고 여기에
 * 넘긴다. 모양은 게스트 안내 토스트(`GuestNoticeToast`)와 같은 흰 상자다.
 *
 * `seq`는 같은 문구가 연달아 와도 타이머를 다시 걸기 위한 번호다. 문구만 들고 있으면 같은 문자열
 * set이 상태 변경으로 안 잡혀 두 번째 안내가 묻힌다.
 *
 * @param message 띄울 문구. null이면 그리지 않는다
 * @param seq 문구를 띄운 횟수
 * @param onDone 시간이 지나 사라질 때
 */
export function PredictionToast({
  message,
  seq,
  onDone,
}: {
  message: string | null;
  seq: number;
  onDone: () => void;
}) {
  useEffect(() => {
    if (seq === 0) return;
    const timer = setTimeout(onDone, ERROR_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [seq, onDone]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-gutter pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center"
    >
      <p className="bg-bg border-border-strong shadow-dialog text-text text-label border px-4 py-2.5 text-center font-bold">
        {message}
      </p>
    </div>
  );
}
