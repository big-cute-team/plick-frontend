import type { TrendItem } from "@plick/domain/types";
import { toTrendDelta } from "@/_utils/trends";

/**
 * 변화 표시의 삼각형 (KAN-501). `currentColor`라 부모가 색을 정하고, `down`이면
 * 뒤집는다 — 위아래 두 벌을 따로 그리는 것보다 회전이 정직하다.
 */
function Caret({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="7"
      height="6"
      viewBox="0 0 7 6"
      fill="currentColor"
      aria-hidden
      className={down ? "rotate-180" : ""}
    >
      <path d="M3.5 0 7 6H0z" />
    </svg>
  );
}

/**
 * 급상승 랭킹 한 줄의 오른쪽 끝 — 순위가 얼마나 움직였는지 (KAN-501).
 *
 * 무엇을 그릴지는 {@link toTrendDelta}가 정한다. 상승은 accent, 하락은 danger,
 * 새로 진입은 글자 배지다. 순위가 그대로인 줄은 점수가 눈에 띄게 움직였으면
 * 흐린 화살표에 변화율을, 아니면 가로줄만 남는다.
 *
 * 화살표는 색으로만 방향을 알리지 않는다 — 삼각형 방향이 형태로 한 번,
 * `sr-only` 문구가 스크린리더로 한 번 더 말한다.
 *
 * @param item 랭킹 한 줄
 */
export function TrendDeltaBadge({ item }: { item: TrendItem }) {
  const delta = toTrendDelta(item);

  if (delta.kind === "new") {
    return (
      <span className="bg-accent-tint text-accent rounded-badge text-micro px-1.5 py-0.5 font-extrabold">
        NEW
      </span>
    );
  }

  if (delta.kind === "same") {
    return (
      <span className="text-caption text-text-4" aria-label="순위 변동 없음">
        —
      </span>
    );
  }

  const up = delta.kind === "up";
  const tone = delta.muted ? "text-text-3" : up ? "text-accent" : "text-danger";

  return (
    <span
      className={`text-caption flex items-center gap-0.5 font-bold ${tone}`}
    >
      <Caret down={!up} />
      <span className="sr-only">{up ? "상승" : "하락"}</span>
      {delta.label}
    </span>
  );
}
