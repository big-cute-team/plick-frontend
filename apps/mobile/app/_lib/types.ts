// PLick 도메인 타입 (mock/화면 공용). BE 연동 시 이 형태를 기준으로 맞춘다.

export type TeamCode = "LIV" | "TOT" | "ARS" | "MUN" | "CHE" | "MCI";

export interface Team {
  code: TeamCode;
  name: string; // 한글 표기 (리버풀)
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

export interface Comment {
  id: string;
  author: string;
  body: string;
  timeLabel: string;
  likeCount: number;
  liked?: boolean;
  replies?: Comment[];
}

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
  summary: string; // 상세 요약
  reporter: Reporter;
  timeLabel: string; // 서버 ISO를 FE에서 포맷하지만, mock은 표시 문자열로 보관
  views: number;
  commentCount: number;
  likeCount: number;
  liked?: boolean;
  saved?: boolean;
  comments?: Comment[];
  debate?: Debate;
}

export interface User {
  nickname: string;
  handle: string; // @kim
  email: string;
  myTeam: TeamCode;
}
