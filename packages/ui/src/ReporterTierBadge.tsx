/**
 * 티어 표시 스펙(KAN-281) — 0=S(파랑·info) · 1=A(초록·accent) · 2=B(회색) · 3=C(회색).
 */
const TIER_BADGE: Record<number, { label: string; classes: string }> = {
  0: { label: "S", classes: "border-info text-info" },
  1: { label: "A", classes: "border-accent text-accent" },
  2: { label: "B", classes: "border-border-strong text-text-3" },
  3: { label: "C", classes: "border-border-strong text-text-3" },
};

/**
 * 기자 티어 배지 — 등급 문자(S·A·B·C) 정사각 아웃라인 칩. 릴/기사 세부 등 공용.
 *
 * 토큰 유틸만 쓰므로 앱 중립적이라 `@plick/ui`에 둔다.
 *
 * BE 실데이터의 절반이 티어 없이 오므로 `tier`가 없거나 매핑에 없는 값이면 배지를
 * 그리지 않는다. 모르는 티어를 임의 등급으로 채우면 신뢰도를 잘못 표시하게 된다.
 *
 * @param reporter - 티어를 표시할 기자 (`tier`만 사용)
 * @param sizeClassName - 정사각 크기·글자 크기 유틸. 표면마다 스케일이 달라
 *   앱이 정한다(릴처럼 키울 자리만 넘긴다).
 */
export function ReporterTierBadge({
  reporter,
  sizeClassName = "size-5 text-micro",
}: {
  reporter: { tier: number | null };
  sizeClassName?: string;
}) {
  const badge = reporter.tier == null ? null : TIER_BADGE[reporter.tier];
  if (!badge) return null;

  return (
    <span
      className={`rounded-badge flex shrink-0 items-center justify-center border font-black ${sizeClassName} ${badge.classes}`}
    >
      {badge.label}
    </span>
  );
}
