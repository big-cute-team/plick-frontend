/**
 * @file MY 활동 탭 상수 (KAN-495, KAN-567에서 `/me` 본문 탭으로 이동).
 */

import type { ActivityTab } from "@/_types/activity";

/** 활동 목록 한 페이지 건수. BE 허용 범위는 1..30이고 기사 피드와 같은 값을 쓴다. */
export const ACTIVITY_PAGE_SIZE = 10;

/** 기본 탭. URL에 `?tab=`이 없거나 모르는 값이면 여기로 떨어진다. 시안 첫 탭이 내 댓글이다. */
export const DEFAULT_ACTIVITY_TAB: ActivityTab = "comments";

/** 탭 나열 순서와 라벨 (시안 MY 3탭). */
export const ACTIVITY_TABS: { key: ActivityTab; label: string }[] = [
  { key: "comments", label: "내 댓글" },
  { key: "likes", label: "좋아요" },
  { key: "votes", label: "투표" },
];

/** 탭별 빈 상태 문구. 시안대로 한 줄이고 마침표가 없다. */
export const ACTIVITY_EMPTY_COPY: Record<ActivityTab, string> = {
  comments: "아직 쓴 댓글이 없어요",
  likes: "좋아요한 이슈가 없어요",
  votes: "투표한 이슈가 없어요",
};

/** 비로그인 상태의 MY 상단 안내와 활동 목록 자리 문구. */
export const ACTIVITY_LOGIN_COPY = {
  title: "로그인하면 활동이 쌓여요",
  description: "좋아요한 이슈와 내가 쓴 댓글을 여기서 다시 볼 수 있어요",
};
