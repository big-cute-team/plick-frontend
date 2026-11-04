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

/**
 * 투표 화면 탭 나열 순서와 라벨, 목적지 (시안 `pollTabs`). 밸런스게임·승부예측을 전환한다(KAN-703).
 * 랭킹(KAN-701)은 여기 셋째 탭이었다가 데스크톱에서는 GNB의 `/rankings`로 나갔다(KAN-724 PR). 모바일은
 * 그대로 셋째 탭이다.
 */
export const DEBATE_TABS: { key: DebateTab; label: string; href: string }[] = [
  { key: "open", label: "밸런스게임", href: "/debates" },
  { key: "prediction", label: "승부예측", href: "/debates?tab=prediction" },
];

/**
 * 비로그인 상태로 선택지를 눌렀을 때 로그인 유도 팝업에 띄우는 문구.
 * 기사 세부와 릴 세부 시트가 같은 문구를 쓴다.
 */
export const VOTE_LOGIN_PROMPT = "VS 참여는 로그인한 사용자만 할 수 있어요.";
