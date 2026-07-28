"use client";

/**
 * 라우트 공통 에러 경계 (KAN-319) — 서버 fetch 실패(BE 다운 등)와 예상 못 한 렌더
 * 에러의 마지막 그물. Next가 실패한 세그먼트를 이 화면으로 대체한다.
 * `reset()`은 세그먼트 재렌더(=재시도). 모바일 `app/error.tsx`와 같은 구성이고
 * 데스크톱이라 hover·focus만 얹는다.
 */
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-7 px-6">
      <div className="flex flex-col items-center gap-2.5">
        <p className="text-headline text-text font-extrabold">
          문제가 생겼어요
        </p>
        <p className="text-body text-text-3 font-semibold">
          잠시 후 다시 시도해 주세요
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="bg-accent text-on-accent rounded-pill text-body-lg focus-visible:outline-accent flex h-13 w-full max-w-60 items-center justify-center font-extrabold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80"
      >
        다시 시도
      </button>
    </main>
  );
}
