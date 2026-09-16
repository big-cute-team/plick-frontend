/**
 * @file 실시간 급상승 랭킹 화면 상수 (KAN-501).
 */

import type { TrendType } from "@plick/domain/types";

/**
 * 사이드바 카드의 탭 구성. 감독은 팀당 한 명씩 여섯 명뿐이라 순위가 의미를
 * 갖지 못해 BE 집계 대상에서 빠졌고(KAN-496), 그래서 탭도 둘이다.
 */
export const TREND_TABS: { type: TrendType; label: string }[] = [
  { type: "TEAM", label: "구단" },
  { type: "PLAYER", label: "선수" },
];
