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
 * 급상승 한 줄의 오른쪽 끝 — 순위가 얼마나 움직였는지 (KAN-501, 시안 KAN-567).
 *
 * 무엇을 그릴지는 {@link toTrendDelta}가 정한다. 시안 색 규칙대로 상승은 강조색,
 * 하락은 흐린 회색(text-4), 새로 진입은 빨간 `NEW` 글자, 그대로면 가로줄이다.
 * 전에는 하락이 빨강이고 NEW가 알약 배지였는데, 빨강은 댓글 수와 새 글에만 쓴다는
 * 시안 규칙에 맞춰 바꿨다. 퍼센트는 그리지 않는다(KAN-523). 칸 폭은 26px 고정이라
 * 이름 열이 변동 글자 길이에 흔들리지 않는다.
 *
 * 화살표는 색으로만 방향을 알리지 않는다 — 삼각형 방향이 형태로 한 번,
 * `sr-only` 문구가 스크린리더로 한 번 더 말한다.
 *
 * @param item 랭킹 한 줄
 */
export function TrendDeltaBadge({ item }: { item: TrendItem }) {
  const delta = toTrendDelta(item);
  const cell = "text-caption w-6.5 shrink-0 text-right font-bold";

  if (delta.kind === "new") {
    return <span className={`${cell} text-danger`}>NEW</span>;
  }

  if (delta.kind === "same") {
    return (
      <span className={`${cell} text-text-4`} aria-label="순위 변동 없음">
        -
      </span>
    );
  }

  const up = delta.kind === "up";

  return (
    <span
      className={`${cell} flex items-center justify-end gap-0.5 ${
        up ? "text-accent" : "text-text-4"
      }`}
    >
      <Caret down={!up} />
      <span className="sr-only">{up ? "상승" : "하락"}</span>
      {delta.label}
    </span>
  );
}
