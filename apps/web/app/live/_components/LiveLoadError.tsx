"use client";

import { useRouter } from "next/navigation";

/**
 * 경기 정보를 불러오지 못했을 때의 에러 상태(피그마 LW3) — BE 502
 * `MATCH_UPSTREAM_ERROR`와 순단이 여기로 온다.
 *
 * @param onRetry - 다시 시도 콜백. 쿼리 지면은 `refetch`를 넘기고, 서버
 *   컴포넌트 fetch 지면(스쿼드)은 생략해 세그먼트 새로고침으로 간다
 * @param compact - 레일처럼 좁은 자리용 낮은 패딩
 */
export function LiveLoadError({
  onRetry,
  compact = false,
}: {
  onRetry?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className={`flex flex-col items-center gap-3 px-6 text-center ${compact ? "py-10" : "py-28"}`}
    >
      <span className="bg-danger/15 text-danger grid size-14 place-items-center rounded-full text-2xl font-bold">
        !
      </span>
      <p className="text-title text-text font-extrabold">
        경기 정보를 불러오지 못했어요
      </p>
      <p className="text-body text-text-4">
        일시적인 오류예요. 잠시 후 다시 시도해 주세요
      </p>
      <button
        type="button"
        onClick={onRetry ?? (() => router.refresh())}
        className="bg-elevate text-text-2 border-border rounded-control text-body hover:bg-elevate-2 focus-visible:outline-accent mt-2 border px-6 py-2.5 font-bold transition-colors focus-visible:outline-2"
      >
        다시 시도
      </button>
    </div>
  );
}
