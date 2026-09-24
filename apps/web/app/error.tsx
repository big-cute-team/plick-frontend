"use client";

import { useEffect } from "react";
import { reportClientError } from "@plick/core/client-error";

/**
 * 라우트 공통 에러 경계 (KAN-319) — 서버 fetch 실패(BE 다운 등)와 예상 못 한 렌더
 * 에러의 마지막 그물. Next가 실패한 세그먼트를 이 화면으로 대체한다.
 * `reset()`은 세그먼트 재렌더(=재시도). 시안 톤(KAN-567)대로 제목, 안내 한 줄, 채운
 * 강조색 버튼 48px이다.
 *
 * 잡은 에러는 `route` 경계 이름으로 서버에 보고한다(KAN-457). web에는 컴포넌트
 * 경계가 없어 클라 에러는 전부 여기로 모인다.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("route", error);
  }, [error]);

  return (
    <main className="max-w-page px-gutter mx-auto flex min-h-dvh w-full flex-col items-start justify-center gap-2">
      <p className="text-section text-text-strong tracking-title font-black">
        문제가 생겼어요
      </p>
      <p className="text-body text-text-3">잠시 후 다시 시도해 주세요</p>
      <button
        type="button"
        onClick={reset}
        className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        다시 시도
      </button>
    </main>
  );
}
