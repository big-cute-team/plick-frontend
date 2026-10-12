"use client";

import { useRouter } from "next/navigation";

/**
 * 경기 정보를 불러오지 못했을 때의 에러 상태. BE 502 `MATCH_UPSTREAM_ERROR`와
 * 순단이 여기로 온다. 시안 톤(KAN-567)대로 안내 한 줄과 텍스트 버튼만 둔다.
 *
 * @param onRetry 다시 시도 콜백. 쿼리 지면은 `refetch`를 넘기고, 서버
 *   컴포넌트 fetch 지면(순위표)은 생략해 세그먼트 새로고침으로 간다
 * @param compact 레일처럼 좁은 자리용 낮은 패딩
 * @param message 안내 문구. 경기 정보가 아닌 자리(선수 프로필 머리)에서 바꾼다
 */
export function LiveLoadError({
  onRetry,
  compact = false,
  message = "경기 정보를 불러오지 못했어요",
}: {
  onRetry?: () => void;
  compact?: boolean;
  message?: string;
}) {
  const router = useRouter();

  return (
    <div
      className={`flex items-baseline gap-3 px-2 ${compact ? "py-6" : "py-10"}`}
    >
      <p className="text-body-md text-text-4">{message}</p>
      <button
        type="button"
        onClick={onRetry ?? (() => router.refresh())}
        className="text-label-lg text-accent hover:text-accent-hover focus-visible:outline-accent font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        다시 시도
      </button>
    </div>
  );
}
