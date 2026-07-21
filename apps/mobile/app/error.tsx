"use client";

import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 라우트 공통 에러 경계 — 서버 fetch 실패(BE 다운 등)와 예상 못 한 렌더 에러의 마지막 그물.
 * Next가 실패한 세그먼트를 이 화면으로 대체한다. `reset()`은 세그먼트 재렌더(=재시도).
 */
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-headline text-text font-extrabold">
            문제가 생겼어요
          </p>
          <p className="text-body text-text-3 font-semibold">
            잠시 후 다시 시도해 주세요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton onClick={reset}>다시 시도</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );
}
