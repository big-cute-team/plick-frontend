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

/** 순단 재시도 횟수. 값과 이유는 `@plick/core/query-policy`에 있다(KAN-685). */
export { LIVE_MAX_RETRIES } from "@plick/core/query-policy";

/**
 * 경기 상태별 상세 탭 구성 (KAN-462). 예전엔 요약·라인업·스탯을 한 지면에 다
 * 펼쳤는데 세로로 너무 길어져 모바일처럼 탭으로 나눴다. 연기·취소는 탭 없이
 * 안내만 그린다. 채팅은 탭이 아니라 우측 패널이다.
 *
 * 뉴스는 KAN-484에서 붙였다 — 경기를 보다가 그 팀 소식이 궁금해지는 자리라
 * 기사 목록으로 나갔다 오는 대신 같은 지면에서 본다. 덕분에 예정 경기도 탭이
 * 둘(프리뷰·뉴스)이라 탭 줄이 선다. 순위 탭은 KAN-567 시안(경기 상세 탭 줄)대로
 * 붙였다. 시안의 채팅 탭은 웹에서 우측 aside가 맡으므로 탭에 없다.
 */
export const MATCH_TABS_BY_STATUS: Record<MatchStatus, MatchTabKey[]> = {
  SCHEDULED: ["preview", "table", "news"],
  LIVE: ["summary", "lineups", "stats", "table", "news"],
  FINISHED: ["summary", "lineups", "stats", "table", "news"],
  POSTPONED: [],
  CANCELLED: [],
};

/**
 * 예측 탭을 맨 끝에 붙인 표 (KAN-696). 연기·취소 경기는 탭 없이 안내만 그리는 지면이라 붙이지
 * 않는다. 날짜 미정 연기 경기의 예측이 OPEN으로 남는 경우(티켓 참고)는 새 일정이 잡혀 SCHEDULED로
 * 돌아오면 탭이 선다.
 */
const TABS_WITH_PREDICTION: Record<MatchStatus, MatchTabKey[]> = {
  SCHEDULED: [...MATCH_TABS_BY_STATUS.SCHEDULED, "prediction"],
  LIVE: [...MATCH_TABS_BY_STATUS.LIVE, "prediction"],
  FINISHED: [...MATCH_TABS_BY_STATUS.FINISHED, "prediction"],
  POSTPONED: [],
  CANCELLED: [],
};

/**
 * 지금 화면에 보이는 상세 탭 목록. 예측할 수 있는 경기(요약 API가 200)면 `prediction`을 맨 끝에
 * 붙인다 (KAN-696). 상태별로 같은 배열 인스턴스를 돌려줘 렌더마다 새 배열이 생기지 않는다.
 *
 * @param status 경기 상태
 * @param hasPrediction 예측 요약이 있는 경기인가. 빅6 밖 경기는 false
 */
export function matchTabsFor(
  status: MatchStatus,
  hasPrediction = false,
): MatchTabKey[] {
  return hasPrediction
    ? TABS_WITH_PREDICTION[status]
    : MATCH_TABS_BY_STATUS[status];
}

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
  table: "순위",
  news: "뉴스",
  prediction: "예측",
};

/**
 * 서버 거절 사유 → 입력바 밑 안내 문구. 목록에 없는 사유는 일반 실패 문구로 떨어진다.
 * `RATE_LIMITED`(KAN-465)는 한 접속이 5초에 5건을 넘긴 것으로, 접속과 입력창은
 * 그대로라 "잠시 후"만 안내한다. `ROOM_BUSY`(KAN-572)는 방 전체가 붐빈 것이라 내 탓이
 * 아님을 밝히고, 입력창은 튕긴 글을 다시 채운다.
 */
export const CHAT_REJECT_MESSAGE: Record<string, string> = {
  EMPTY_MESSAGE: "내용을 입력해 주세요",
  MESSAGE_TOO_LONG: "200자까지 보낼 수 있어요",
  RATE_LIMITED: "너무 빠르게 보내고 있어요. 잠시 후 다시 보내 주세요",
  ROOM_BUSY: "채팅이 몰리고 있어요. 잠시 뒤 다시 보내 주세요",
};

/**
 * 날짜 줄이 선택 칸을 화면 안으로 되돌릴 때 남기는 좌우 여백(px) (KAN-569, 모바일과 같은 값).
 * 0이면 칸이 줄 가장자리에 붙어 다음 칸이 있는지 안 보인다.
 */
export const DATE_STRIP_KEEP_PAD = 12;
