/**
 * @file PLick 도메인 타입 — web·mobile 공용 단일 출처. BE 연동 시 이 형태를 기준으로 맞춘다.
 *
 * 원래 두 앱 `app/_lib/types.ts`에 수동 동기화 복제로 두던 것을(ADR 0011 §3)
 * 구조 감사(2026-07-16)에서 드리프트가 실증되어 `@plick/domain`으로 승격했다(ADR 0018).
 */

/** 빅6 팀 코드 */
export type TeamCode = "LIV" | "TOT" | "ARS" | "MUN" | "CHE" | "MCI";

export interface Team {
  code: TeamCode;
  /** 한글 표기 (예: 리버풀) */
  name: string;
  /** theme.css의 팀 컬러 CSS 변수명 (예: --plk-team-liv) */
  colorVar: string;
}

/** 루머 신뢰 단계 */
export type RumorStage = "RUMOUR" | "IN_PROGRESS" | "OFFICIAL";

/** 게시물 유형 — 일반/토론/완료 */
export type ContentType = "GENERAL" | "DEBATE" | "FINISH";

export interface Reporter {
  name: string;
  /** 1 = 최상위 신뢰(티어1, Romano 등) */
  tier: 1 | 2 | 3;
}

/** 게시물 댓글(+답글). 릴 세부 패널·바텀시트·기사 세부에서 소비. */
export interface Comment {
  id: string;
  /** 작성자 핸들 (예: `@kop_anfield`) */
  author: string;
  body: string;
  timeLabel: string;
  likeCount: number;
  liked?: boolean;
  replies?: Comment[];
}

/** 토론형 게시물의 투표 블록 (모바일 릴에서 소비, 웹은 미사용) */
export interface Debate {
  topic: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  closesLabel: string;
  myVote?: "A" | "B" | null;
}

export interface FeedPost {
  id: string;
  team: TeamCode;
  stage: RumorStage;
  contentType: ContentType;
  title: string;
  /** 상세 화면용 요약 (카드·시트 미리보기) */
  summary: string;
  /** 기사 세부 본문 문단 목록. 없으면 요약 한 문단으로 대체한다. */
  body?: string[];
  /** 상세 시트 해시태그 (`#` 제외한 키워드) */
  tags?: string[];
  reporter: Reporter;
  /** 표시용 상대 시각 (서버 ISO를 FE에서 포맷하지만, mock은 표시 문자열로 보관) */
  timeLabel: string;
  views: number;
  commentCount: number;
  likeCount: number;
  liked?: boolean;
  saved?: boolean;
  /** 세부 패널·시트 댓글 목록 */
  comments?: Comment[];
  debate?: Debate;
}

export interface User {
  nickname: string;
  /** 핸들 (예: `@kim`) */
  handle: string;
  email: string;
  myTeam: TeamCode;
}

/** 팀 필터 선택값 — 전체(ALL) 또는 특정 팀. 홈·기사 등 팀 필터 탭 공용. */
export type Filter = "ALL" | TeamCode;
