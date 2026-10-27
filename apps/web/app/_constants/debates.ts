/**
 * @file 토론(투표) 화면 상수 (KAN-418).
 */

import type { DebateTab } from "@/_types/debates";

/**
 * 투표 리스트를 신선한 것으로 보는 시간(ms) (KAN-681). 모바일과 같은 판단이다.
 * 피드의 30분(`FEED_FRESH_MS`)은 커서 페이지와 스크롤 자리를 지키려는 값인데 투표
 * 리스트는 배열 하나라 해당이 없고, 그 탓에 60초 ISR인 기사 상세와 집계가 어긋났다.
 */
export const DEBATE_FRESH_MS = 60_000;

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
