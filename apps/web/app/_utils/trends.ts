/**
 * @file 급상승 랭킹 한 줄의 변화 표시를 정하는 순수 함수 (KAN-501).
 *
 * 규칙이 `direction`·`rankDelta`·`scoreChangeRate` 세 필드에 흩어져 있고
 * 셋 다 비어 있을 수 있어, 화면이 분기를 들고 있으면 JSX가 조건문 덩어리가
 * 된다. 판정을 여기서 한 번에 끝내고 화면은 결과만 그린다.
 */

import type { TrendItem } from "@plick/domain/types";

/**
 * 순위가 그대로(`SAME`)일 때 점수 변화율로 화살표를 그릴 최소 크기.
 *
 * 티켓이 허용한 보조 표시다 — 실사용 트래픽이 붙기 전에는 참여가 거의 없어
 * 순위가 잘 안 바뀌고, 그러면 모든 줄이 가로줄만 달고 있어 화면이 죽는다.
 * 0.5% 미만은 반올림하면 0.0%로 보여 화살표가 오히려 거짓말이 되므로 자른다.
 */
const SCORE_ARROW_MIN = 0.005;

/** 화면이 그릴 변화 표시. `muted`는 순위가 아니라 점수 변화에서 온 화살표다. */
export type TrendDelta =
  | { kind: "new" }
  | { kind: "up" | "down"; label: string; muted: boolean }
  | { kind: "same" };

/**
 * 랭킹 한 줄의 변화 표시를 고른다.
 *
 * `NEW`는 이번 회차에 처음 들어온 항목이라 비교할 직전 순위가 없어 화살표
 * 대신 표식을 단다. `UP`·`DOWN`은 오른 칸 수를 붙이되, `rankDelta`가 비어
 * 오면 방향만 그린다. `SAME`은 점수 변화가 눈에 띄면 흐린 화살표로, 아니면
 * 가로줄로 남는다.
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
      muted: false,
    };
  }

  const rate = item.scoreChangeRate ?? 0;
  if (Math.abs(rate) >= SCORE_ARROW_MIN) {
    return {
      kind: rate > 0 ? "up" : "down",
      label: `${(Math.abs(rate) * 100).toFixed(1)}%`,
      muted: true,
    };
  }

  return { kind: "same" };
}
