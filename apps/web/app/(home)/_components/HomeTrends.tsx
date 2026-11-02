import { unstable_rethrow } from "next/navigation";
import { getHomeTrends } from "@plick/core/home-trends";
import type { TrendRanking } from "@plick/domain/types";
import { HomeTrendTicker } from "./HomeTrendTicker";

/** 홈 첫 줄의 실시간 급상승 순위를 독립적으로 스트리밍한다. */
export async function HomeTrends() {
  let initial: TrendRanking | undefined;
  try {
    initial = await getHomeTrends();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[home] 실검 로드 실패:", error);
  }
  return <HomeTrendTicker initial={initial} />;
}
