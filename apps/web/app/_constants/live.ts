/**
 * @file 라이브 스코어 클라 쿼리 정책 상수 (KAN-452). 모바일 `_constants/live.ts`와
 * 같은 값의 수동 동기화 복제다 — 캐시·폴링 정책은 앱 정책이라 승격하지 않는다.
 * 경기 상세 탭 구성(KAN-458 → KAN-462)도 화면 정책이라 여기 둔다.
 */

import type { MatchStatus } from "@plick/domain/live";
import type { MatchTabKey } from "@/_types/live";

/**
 * 라이브 경기가 있을 때의 폴링 간격(ms). BE 라이브 오버레이·상세 캐시 TTL이
 * 20초라 그보다 짧게 돌아봐야 새 값이 없다. 라이브가 없으면 폴링을 끈다
 * (훅의 `refetchInterval`이 응답을 보고 판정한다).
 */
export const LIVE_POLL_MS = 20_000;

/**
 * 순단 재시도 횟수. 502(외부 API 실패)는 다시 보내면 캐시가 채워져 성공할 수
 * 있어 한 번은 다시 시도하고, 그 이상은 에러 지면의 다시 시도에 맡긴다.
 */
export const LIVE_MAX_RETRIES = 1;

/**
 * 경기 상태별 상세 탭 구성 (KAN-462). 예전엔 요약·라인업·스탯을 한 지면에 다
 * 펼쳤는데 세로로 너무 길어져 모바일처럼 탭으로 나눴다. 예정 경기는 프리뷰
 * 하나라 탭 줄 없이 본문만 그리고, 연기·취소는 탭 없이 안내만 그린다. 채팅은
 * 탭이 아니라 우측 패널이다.
 */
export const MATCH_TABS_BY_STATUS: Record<MatchStatus, MatchTabKey[]> = {
  SCHEDULED: ["preview"],
  LIVE: ["summary", "lineups", "stats"],
  FINISHED: ["summary", "lineups", "stats"],
  POSTPONED: [],
  CANCELLED: [],
};

/** 탭 라벨. */
export const MATCH_TAB_LABEL: Record<MatchTabKey, string> = {
  preview: "프리뷰",
  summary: "요약",
  lineups: "라인업",
  stats: "스탯",
};

/** 서버 거절 사유 → 입력바 밑 안내 문구. 목록에 없는 사유는 일반 실패 문구로 떨어진다. */
export const CHAT_REJECT_MESSAGE: Record<string, string> = {
  EMPTY_MESSAGE: "내용을 입력해 주세요",
  MESSAGE_TOO_LONG: "200자까지 보낼 수 있어요",
};
