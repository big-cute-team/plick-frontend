/**
 * @file MY 화면 상수 (KAN-567 시안 MY 575-739행). 좌측 메뉴, 내 활동 탭, 활동 목록
 * 페이지 크기. 앱 버전 라벨은 시안에 없어 지웠다.
 */

import type { ActivityTab } from "@/_types/activity";

/** 좌측 메뉴. 순서와 라벨은 시안 `meNav` 그대로다. */
export const ME_NAV: { href: string; label: string }[] = [
  { href: "/me", label: "내 활동" },
  { href: "/me/edit", label: "계정" },
  { href: "/me/blocked", label: "차단 목록" },
];

/** 활동 목록 한 페이지 건수. BE 허용 범위는 1..30이고 기사 피드와 같은 값을 쓴다. */
export const ACTIVITY_PAGE_SIZE = 10;

/** 기본 탭. URL에 `?tab=`이 없거나 모르는 값이면 여기로 떨어진다. 시안의 첫 탭이다. */
export const DEFAULT_ACTIVITY_TAB: ActivityTab = "comments";

/** 탭 나열 순서와 라벨 (시안 `actTabs`). */
export const ACTIVITY_TABS: { key: ActivityTab; label: string }[] = [
  { key: "comments", label: "내 댓글" },
  { key: "likes", label: "좋아요" },
  { key: "votes", label: "내 투표" },
];

/** 탭별 빈 상태 문구. 투표 목록 API가 없어 `votes`는 늘 이 문구다. */
export const ACTIVITY_EMPTY_COPY: Record<ActivityTab, string> = {
  comments: "아직 쓴 댓글이 없어요",
  likes: "아직 좋아요한 기사가 없어요",
  votes: "아직 참여한 투표가 없어요",
};

/**
 * `?tab=` 값을 탭으로 좁힌다. 없거나 모르는 값이면 기본 탭이다.
 *
 * @param value 쿼리스트링의 `tab` 값
 */
export function activityTabFrom(value: string | undefined): ActivityTab {
  return value === "likes" || value === "votes" ? value : DEFAULT_ACTIVITY_TAB;
}

/**
 * 탭 → MY URL. 기본 탭은 쿼리를 붙이지 않아 주소가 짧다.
 *
 * @param tab 열 탭
 */
export function activityTabPath(tab: ActivityTab): string {
  return tab === DEFAULT_ACTIVITY_TAB ? "/me" : `/me?tab=${tab}`;
}
