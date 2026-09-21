/**
 * @file 마이페이지 활동 화면 상수 (KAN-495).
 */

import type { ActivityTab } from "@/_types/activity";

/** 활동 목록 한 페이지 건수. BE 허용 범위는 1..30이고 기사 피드와 같은 값을 쓴다. */
export const ACTIVITY_PAGE_SIZE = 10;

/** 기본 탭. URL에 `?tab=`이 없거나 모르는 값이면 여기로 떨어진다. */
export const DEFAULT_ACTIVITY_TAB: ActivityTab = "likes";

/** 탭 나열 순서와 라벨. 개수는 화면이 옆에 붙인다. */
export const ACTIVITY_TABS: { key: ActivityTab; label: string }[] = [
  { key: "likes", label: "좋아요한 기사" },
  { key: "comments", label: "내가 쓴 댓글" },
];

/** 탭별 빈 상태 문구. 제목과 다음 행동을 한 줄씩. */
export const ACTIVITY_EMPTY_COPY: Record<
  ActivityTab,
  { title: string; hint: string }
> = {
  likes: {
    title: "아직 좋아요한 기사가 없어요",
    hint: "마음에 드는 기사에 하트를 누르면 여기 모여요",
  },
  comments: {
    title: "아직 쓴 댓글이 없어요",
    hint: "기사에 남긴 댓글이 여기 모여요",
  },
};

/** 비로그인 상태의 활동 화면 안내 문구. */
export const ACTIVITY_LOGIN_COPY = {
  title: "로그인하면 활동이 쌓여요",
  description:
    "좋아요한 기사와 내가 쓴 댓글을 여기서 다시 볼 수 있어요. 로그인하지 않으면 활동이 남지 않아요.",
};
