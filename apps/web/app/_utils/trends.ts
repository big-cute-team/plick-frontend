/**
 * @file 급상승 랭킹 한 줄의 순위 변동 표시를 정하는 순수 함수 (KAN-501).
 *
 * 규칙이 `direction`·`rankDelta` 두 필드에 흩어져 있고 `rankDelta`는 비어 있을
 * 수 있어, 화면이 분기를 들고 있으면 JSX가 조건문 덩어리가 된다. 판정을 여기서
 * 한 번에 끝내고 화면은 결과만 그린다.
 */

import type { TrendItem } from "@plick/domain/types";

/** 화면이 그릴 순위 변동. 넷뿐이다: ▲3, ▼2, -, NEW (KAN-523). */
export type TrendDelta =
  | { kind: "new" }
  | { kind: "up" | "down"; label: string }
  | { kind: "same" };

/**
 * 랭킹 한 줄의 순위 변동을 고른다.
 *
 * `NEW`는 이번 회차에 처음 들어온 항목이라 비교할 직전 순위가 없어 화살표
 * 대신 표식을 단다. `UP`·`DOWN`은 움직인 칸 수를 붙이되, `rankDelta`가 비어
 * 오면 방향만 그린다. 나머지는 가로줄이다.
 *
 * KAN-501 때는 순위가 그대로인 줄에 점수 변화율을 흐린 화살표로 붙였는데
 * KAN-523에서 뺐다. 변화율은 점유율 점수의 변화라 1위를 지키고 있어도
 * "하락 2.1%"로 보였다 — 순위 카드에서 순위 말고 다른 수가 움직이면 읽는
 * 사람이 헷갈린다.
 *
 * @param item 랭킹 한 줄
 */
export function toTrendDelta(item: TrendItem): TrendDelta {
  if (item.direction === "NEW") return { kind: "new" };

  if (item.direction === "UP" || item.direction === "DOWN") {
    const moved = Math.abs(item.rankDelta ?? 0);
    return {
      kind: item.direction === "UP" ? "up" : "down",
      label: moved > 0 ? String(moved) : "",
    };
  }

  return { kind: "same" };
}
