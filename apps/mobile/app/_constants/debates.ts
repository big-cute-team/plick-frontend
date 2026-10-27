/**
 * @file 투표 화면 상수 (KAN-418, KAN-567 리디자인).
 */

import type { DebateTab } from "@/_types/debates";

/**
 * 비로그인 상태로 선택지를 눌렀을 때 로그인 유도 시트에 띄우는 문구.
 * 기사 세부와 릴 세부 시트, 투표 탭이 같은 문구를 쓴다.
 */
export const VOTE_LOGIN_PROMPT = "투표는 로그인한 사용자만 할 수 있어요.";

/**
 * 투표 리스트를 신선한 것으로 보는 시간(ms) (KAN-681).
 *
 * 전에는 피드와 같은 30분(`FEED_FRESH_MS`)이었다. 그 값은 커서 피드가 쌓은 페이지와
 * 스크롤 자리를 지키려고 올린 것인데, 투표 리스트는 페이지네이션 없는 배열 하나라
 * 그 이유가 해당되지 않는다. 대신 기사 상세(60초 ISR)보다 최대 30분 늦은 집계를
 * 보여줘서 투표 탭과 기사의 숫자가 어긋났다. 서버 캐시와 같은 60초로 맞춘다.
 * 지나면 탭에 돌아올 때 보던 리스트를 그대로 둔 채 뒤에서 다시 받는다.
 */
export const DEBATE_FRESH_MS = 60_000;

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

/**
 * 탭별 목록 머리(스크린리더 전용 h2). 화면 h1과 카드 제목 h3 사이 레벨을 채운다
 * (heading-order, KAN-670).
 */
export const DEBATE_LIST_HEADING: Record<DebateTab, string> = {
  open: "진행 중인 투표",
  closed: "마감된 투표",
};
