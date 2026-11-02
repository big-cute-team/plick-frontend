import { unstable_rethrow } from "next/navigation";
import { getMatches } from "@plick/core/live";
import { todayDateKeyKst, type MatchSummary } from "@plick/domain/live";
import { LIVE_SCORE_PAUSED } from "@plick/domain/live-pause";
import { HomeLiveTicker } from "./HomeLiveTicker";

/** 홈 경기 한 줄의 첫 응답. 스코어 운영 중단 정책을 유지한다. */
export async function HomeLive() {
  if (LIVE_SCORE_PAUSED) return null;
  const date = todayDateKeyKst();
  let items: MatchSummary[] | undefined;
  try {
    items = await getMatches(date);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[home] 경기 로드 실패:", error);
  }
  return <HomeLiveTicker initial={items && { date, items }} />;
}
