import type { Reporter } from "@/_lib/types";

/**
 * 기자 티어 배지 — `T{tier}` 정사각 아웃라인 칩. ReelItem·ReelDetailSheet 공용.
 *
 * @param reporter - 티어를 표시할 기자
 */
export function ReporterTierBadge({ reporter }: { reporter: Reporter }) {
  return (
    <span className="border-accent text-accent rounded-badge text-micro flex size-5 shrink-0 items-center justify-center border font-black">
      T{reporter.tier}
    </span>
  );
}
