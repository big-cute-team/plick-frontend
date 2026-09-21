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
 * 펼쳤는데 세로로 너무 길어져 모바일처럼 탭으로 나눴다. 연기·취소는 탭 없이
 * 안내만 그린다. 채팅은 탭이 아니라 우측 패널이다.
 *
 * 뉴스는 KAN-484에서 붙였다 — 경기를 보다가 그 팀 소식이 궁금해지는 자리라
 * 기사 목록으로 나갔다 오는 대신 같은 지면에서 본다. 덕분에 예정 경기도 탭이
 * 둘(프리뷰·뉴스)이라 탭 줄이 선다.
 */
export const MATCH_TABS_BY_STATUS: Record<MatchStatus, MatchTabKey[]> = {
  SCHEDULED: ["preview", "news"],
  LIVE: ["summary", "lineups", "stats", "news"],
  FINISHED: ["summary", "lineups", "stats", "news"],
  POSTPONED: [],
  CANCELLED: [],
};

/**
 * 요약·라인업·스탯 탭이 빈 자리에 세우는 문구 (KAN-484).
 *
 * 전에는 상태와 무관하게 한 문구였다. 그래서 끝난 경기에 라인업이 안 실려 오면
 * "라인업은 킥오프 20~40분 전에 공개돼요"가 떠서, 종료된 경기를 열었는데 킥오프
 * 전이라고 말하는 꼴이 됐다. 아직 올 수 있는 경우(`pending`)와 더 올 것이 없는
 * 경우(`done`)를 갈라 둔다.
 */
const MATCH_EMPTY_LABEL: Record<
  "summary" | "lineups" | "stats",
  { pending: string; done: string }
> = {
  summary: {
    pending: "요약 정보가 아직 없어요",
    done: "이 경기의 요약 정보가 없어요",
  },
  lineups: {
    pending: "라인업은 킥오프 20~40분 전에 공개돼요",
    done: "이 경기의 라인업 정보가 없어요",
  },
  stats: {
    pending: "스탯 정보가 아직 없어요",
    done: "이 경기의 스탯 정보가 없어요",
  },
};

/**
 * 빈 탭 문구를 경기 상태에 맞춰 고른다. 끝났거나 취소·연기된 경기는 더 들어올
 * 데이터가 없으므로 기다리라는 말을 하지 않는다.
 *
 * @param tab 지금 탭
 * @param status 경기 상태
 */
export function matchEmptyLabel(
  tab: "summary" | "lineups" | "stats",
  status: MatchStatus,
): string {
  return MATCH_EMPTY_LABEL[tab][status === "LIVE" ? "pending" : "done"];
}

/**
 * 뉴스 탭이 목록을 기다리는 동안 까는 스켈레톤 줄 수 (KAN-484). 실제로 올 건수
 * (`MATCH_NEWS_COUNT`)보다 적게 둔다 — 탭 본문은 화면 한 판이 넘어가면 어차피
 * 스크롤 밖이라, 자리만 잡아 주면 된다.
 */
export const MATCH_NEWS_SKELETON_COUNT = 4;

/** 탭 라벨. */
export const MATCH_TAB_LABEL: Record<MatchTabKey, string> = {
  preview: "프리뷰",
  summary: "요약",
  lineups: "라인업",
  stats: "스탯",
  news: "뉴스",
};

/**
 * 서버 거절 사유 → 입력바 밑 안내 문구. 목록에 없는 사유는 일반 실패 문구로 떨어진다.
 * `RATE_LIMITED`(KAN-465)는 한 접속이 5초에 5건을 넘긴 것으로, 접속과 입력창은
 * 그대로라 "잠시 후"만 안내한다.
 */
export const CHAT_REJECT_MESSAGE: Record<string, string> = {
  EMPTY_MESSAGE: "내용을 입력해 주세요",
  MESSAGE_TOO_LONG: "200자까지 보낼 수 있어요",
  RATE_LIMITED: "너무 빠르게 보내고 있어요. 잠시 후 다시 보내 주세요",
};
