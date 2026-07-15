/**
 * 기자 티어 배지 — `T{tier}` 정사각 아웃라인 칩. 릴/기사 세부 등 공용.
 *
 * 토큰 유틸만 쓰므로 앱 중립적이라 `@plick/ui`에 둔다.
 *
 * @param reporter - 티어를 표시할 기자 (`tier`만 사용)
 */
export function ReporterTierBadge({
  reporter,
}: {
  reporter: { tier: number };
}) {
  return (
    <span className="border-accent text-accent rounded-badge text-micro flex size-5 shrink-0 items-center justify-center border font-black">
      T{reporter.tier}
    </span>
  );
}
