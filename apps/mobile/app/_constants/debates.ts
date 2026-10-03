/**
 * @file 투표 화면 상수 (KAN-418, KAN-567 리디자인).
 */

import type { DebateTab } from "@/_types/debates";

/**
 * 비로그인 상태로 선택지를 눌렀을 때 로그인 유도 시트에 띄우는 문구.
 * 기사 세부와 릴 세부 시트, 투표 탭이 같은 문구를 쓴다.
 */
export const VOTE_LOGIN_PROMPT = "투표는 로그인한 사용자만 할 수 있어요.";

/** 기본 탭. URL에 `?tab=`이 없거나 모르는 값이면 진행 중이다. */
export const DEFAULT_DEBATE_TAB: DebateTab = "open";

/** 탭 나열 순서와 라벨 (시안 투표 2탭). */
export const DEBATE_TABS: { key: DebateTab; label: string }[] = [
  { key: "open", label: "진행 중" },
  { key: "closed", label: "마감" },
];

/** 탭별 빈 상태 문구. */
export const DEBATE_EMPTY_COPY: Record<DebateTab, string> = {
  open: "진행 중인 투표가 없어요",
  closed: "마감된 투표가 없어요",
};
