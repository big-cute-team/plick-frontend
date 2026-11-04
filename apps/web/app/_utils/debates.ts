/**
 * @file 투표 화면의 탭 ↔ URL 변환 (KAN-667). 모바일 `_utils/debates.ts`와 같은 규약이다.
 * 탭의 원본은 URL `?tab=`이라 새로고침해도 보던 탭이 그대로다.
 */

import type { DebateTab } from "@/_types/debates";

/** 기본 탭. 쿼리가 없거나 모르는 값이면 밸런스게임이다. */
export const DEFAULT_DEBATE_TAB: DebateTab = "open";

/**
 * `?tab=` 값을 탭으로 좁힌다. 없거나 모르는 값이면 밸런스게임이다. 옛 `rank`는 여기서는 모르는 값이고
 * `useDebateTab`이 `/rankings`로 보낸다(KAN-724 PR).
 *
 * @param value 쿼리스트링의 `tab` 값 (없으면 null·undefined)
 */
export function debateTabFrom(value: string | null | undefined): DebateTab {
  return value === "prediction" ? value : DEFAULT_DEBATE_TAB;
}

/** 옛 랭킹 탭 쿼리 값. 이 값으로 들어오면 `/rankings`로 보낸다. 모바일 링크와 북마크가 아직 이걸 쓴다. */
export const LEGACY_RANK_TAB = "rank";

/** 투표 화면 경로. */
export const DEBATES_PATH = "/debates";

/**
 * 탭 → 투표 화면 URL. 기본 탭은 쿼리를 붙이지 않는다. 모바일과 같은 규약이다 (KAN-683).
 *
 * @param tab 열 탭
 */
export function debateTabPath(tab: DebateTab): string {
  return tab === DEFAULT_DEBATE_TAB
    ? DEBATES_PATH
    : `${DEBATES_PATH}?tab=${tab}`;
}
