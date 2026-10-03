"use client";

import { useRouter } from "next/navigation";

/**
 * 경기 정보를 불러오지 못했을 때의 에러 상태(피그마 L4, KAN-567 톤). BE 502
 * `MATCH_UPSTREAM_ERROR`와 순단이 여기로 온다. 문구 두 줄과 테두리 버튼 하나다.
 *
 * @param onRetry 다시 시도 콜백. 쿼리 지면은 QueryBoundary의 retry를 넘기고,
 *   서버 컴포넌트 fetch 지면(순위표)은 생략해 세그먼트 새로고침으로 간다
 */
export function LiveLoadError({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-20 text-center">
      <p className="text-body-lg text-text-strong font-black">
        경기 정보를 불러오지 못했어요
      </p>
      <p className="text-body text-text-4">
        일시적인 오류예요. 잠시 후 다시 시도해 주세요
      </p>
      <button
        type="button"
        onClick={onRetry ?? (() => router.refresh())}
        className="border-border-strong text-label-lg text-text-2 rounded-control mt-3 border px-4 py-2 font-bold active:opacity-70"
      >
        다시 시도
      </button>
    </div>
  );
}
