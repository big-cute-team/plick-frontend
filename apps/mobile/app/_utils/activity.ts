/**
 * @file 활동 화면의 탭 ↔ URL 변환 (KAN-495). 탭의 원본은 URL `?tab=`이다.
 * 기사 페이지의 팀 필터(`/articles/teams/[slug]`)와 같은 판단으로, 새로고침해도
 * 보던 탭이 그대로고 마이페이지의 개수 타일이 탭을 골라 들어올 수 있다.
 */

import { DEFAULT_ACTIVITY_TAB } from "@/_constants/activity";
import type { ActivityTab } from "@/_types/activity";

/** 활동 화면 경로. */
export const ACTIVITY_PATH = "/me/activity";

/**
 * `?tab=` 값을 탭으로 좁힌다. 없거나 모르는 값이면 기본 탭이다.
 *
 * @param value 쿼리스트링의 `tab` 값 (없으면 null·undefined)
 */
export function activityTabFrom(value: string | null | undefined): ActivityTab {
  return value === "comments" ? "comments" : DEFAULT_ACTIVITY_TAB;
}

/**
 * 탭 → 활동 화면 URL. 기본 탭은 쿼리를 붙이지 않아 주소가 짧다.
 *
 * @param tab 열 탭
 */
export function activityTabPath(tab: ActivityTab): string {
  return tab === DEFAULT_ACTIVITY_TAB
    ? ACTIVITY_PATH
    : `${ACTIVITY_PATH}?tab=${tab}`;
}
