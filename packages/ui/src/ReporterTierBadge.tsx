/**
 * 기자 티어 배지 — `T{tier}` 정사각 아웃라인 칩. 릴/기사 세부 등 공용.
 *
 * 토큰 유틸만 쓰므로 앱 중립적이라 `@plick/ui`에 둔다.
 *
 * BE 실데이터의 절반이 티어 없이 오므로 `tier`가 없으면 배지를 그리지 않는다.
 * 모르는 티어를 임의의 숫자로 채우면 신뢰도를 잘못 표시하게 된다.
 *
 * @param reporter - 티어를 표시할 기자 (`tier`만 사용)
 */
export function ReporterTierBadge({
  reporter,
}: {
  reporter: { tier: number | null };
}) {
  if (reporter.tier == null) return null;

  return (
    <span className="border-accent text-accent rounded-badge text-micro flex size-5 shrink-0 items-center justify-center border font-black">
      T{reporter.tier}
    </span>
  );
}
