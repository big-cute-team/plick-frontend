/**
 * @file 토론(투표) 화면 상수 (KAN-418).
 */

import type { DebateTab } from "@/_types/debates";

/** 투표 화면 탭 나열 순서와 라벨, 목적지 (시안 `pollTabs`). */
export const DEBATE_TABS: { key: DebateTab; label: string; href: string }[] = [
  { key: "open", label: "진행 중", href: "/debates" },
  { key: "closed", label: "마감", href: "/debates?tab=closed" },
];

/**
 * 비로그인 상태로 선택지를 눌렀을 때 로그인 유도 팝업에 띄우는 문구.
 * 기사 세부와 릴 세부 시트가 같은 문구를 쓴다.
 */
export const VOTE_LOGIN_PROMPT = "VS 참여는 로그인한 사용자만 할 수 있어요.";

/**
 * 탭별 목록 머리(스크린리더 전용 h2). 화면 h1과 카드 제목 h3 사이 레벨을 채운다
 * (heading-order, KAN-670).
 */
export const DEBATE_LIST_HEADING: Record<DebateTab, string> = {
  open: "진행 중인 투표",
  closed: "마감된 투표",
};
