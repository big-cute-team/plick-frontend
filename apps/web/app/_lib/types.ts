/**
 * @file PLick 도메인 타입 (mock/화면 공용). BE 연동 시 이 형태를 기준으로 맞춘다.
 *
 * 모바일 `apps/mobile/app/_lib/types.ts`와 같은 API를 소비하므로 **모양을 항상
 * 동일하게 유지**한다 (BE 연동 전까지는 수동 동기화).
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

/** 게시물 댓글(+답글). 릴 세부 패널·바텀시트에서 소비. */
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

export interface FeedPost {
  id: string;
  team: TeamCode;
  stage: RumorStage;
  contentType: ContentType;
  title: string;
  /** 상세 화면용 요약 */
  summary: string;
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
  /** 세부 패널 댓글 목록 */
  comments?: Comment[];
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
