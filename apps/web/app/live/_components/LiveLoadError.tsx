"use client";

import { useRouter } from "next/navigation";

/**
 * 경기 목록 에러 상태(피그마 LW3, 502 MATCH_UPSTREAM_ERROR 대응 지면).
 * 껍데기 단계라 다시 시도는 `router.refresh()`만 한다 — 실배선 때 쿼리
 * refetch로 바꾼다.
 */
export function LiveLoadError() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-28 text-center">
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
        onClick={() => router.refresh()}
        className="bg-elevate text-text-2 border-border rounded-control text-body hover:bg-elevate-2 focus-visible:outline-accent mt-2 border px-6 py-2.5 font-bold transition-colors focus-visible:outline-2"
      >
        다시 시도
      </button>
    </div>
  );
}
