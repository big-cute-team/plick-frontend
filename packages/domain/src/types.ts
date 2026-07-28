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

/** 루머 신뢰 단계. CONFIRM은 BE 예정 단계라 타입만 선반영 (KAN-299). */
export type RumorStage = "RUMOUR" | "IN_PROGRESS" | "CONFIRM" | "OFFICIAL";

/** 게시물 유형 — 일반/토론/완료 */
export type ContentType = "GENERAL" | "DEBATE" | "FINISH";

export interface Reporter {
  name: string;
  /** 0 = 최상위 신뢰. 표시 등급은 0=S·1=A·2=B·3=C로 매핑한다(KAN-281, ReporterTierBadge). */
  tier: 0 | 1 | 2 | 3;
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

/**
 * 내 프로필 — `GET /users/me`를 화면 소비 형태로 좁힌 것 (KAN-267).
 * 온보딩 전엔 닉네임이, 카카오 가입이면 이메일이 없다. 응원팀은 다중 선택이라
 * 배열 그대로 두고, BE 팀 항목을 팀 코드로만 좁힌다(각 앱 `_services/profile.ts`).
 * 모바일 `_types/api.ts`에 있던 것을 web 이식(KAN-319)에서 승격했다.
 */
export interface MyProfile {
  nickname: string | null;
  email: string | null;
  /** 닉네임을 다시 바꿀 수 있는 시각(ISO, KST 오프셋) — null이면 지금 바로 변경 가능.
   * 7일 정책 계산은 BE 몫이고, 화면은 이 값으로 입력 잠금·안내만 한다(KAN-269). */
  nicknameChangeableAt: string | null;
  myTeams: TeamCode[];
}

/** 팀 필터 선택값 — 전체(ALL) 또는 특정 팀. 홈·기사 등 팀 필터 탭 공용. */
export type Filter = "ALL" | TeamCode;

/**
 * 기사 원문을 낸 기자 (KAN-271, `GET /api/v1/articles`). BE는 객체 자체가 없을
 * 수 있다. 모바일 `_types/articles.ts`에 있던 것을 web 이식(KAN-321)에서 승격했다.
 */
export interface ArticleReporter {
  /** 표시용 이름 — BE의 한국어명이 아직 전부 비어 있어 영문명으로 대체된다. */
  name: string;
  /** 1 = 최상위 신뢰. BE 실데이터의 절반이 비어 있어 null을 허용한다. */
  tier: number | null;
}

/**
 * 피드 목록의 기사 카드 한 장 (KAN-271, `GET /api/v1/articles`).
 *
 * 위 `FeedPost`는 퍼블리싱 단계에서 BE 목표 shape를 추정해 만든 타입이고, 실제
 * 계약은 그와 여러 군데 어긋난다 — 팀이 다중이고, 단계와 기자 정보가 null일 수
 * 있고, 본문·댓글·토론은 목록 응답에 아예 없다. 그래서 목록 카드는 `FeedPost`를
 * 재사용하지 않고 실제 계약을 그대로 담는다. 모바일 `_types/articles.ts`에 있던
 * 것을 web 이식(KAN-321)에서 승격했다.
 */
export interface ArticleCard {
  /** BE `articleSummaryId`를 문자열로 담는다 (라우트 파라미터와 결이 같다). */
  id: string;
  title: string;
  /** BE가 긴 요약(`summary_detail`)을 내려준다. 카드에서는 줄수로 자른다. */
  summary: string;
  /** 루머 단계. BE 실데이터의 절반이 비어 있다. */
  stage: RumorStage | null;
  /** 발행 시각 ISO-8601. BE가 KST 오프셋(+09:00)을 박아 내려준다. */
  publishedAt: string;
  /** 태그된 팀 목록 — 다중이고 없을 수 있다. 첫 팀을 대표로 쓴다. */
  teams: TeamCode[];
  /** 대표 이미지. BE 실데이터가 아직 전부 비어 있어 없으면 자리를 그리지 않는다. */
  imageUrl: string | null;
  reporter: ArticleReporter | null;
  /** 원문 링크 (현재는 전부 x.com) */
  sourceUrl: string | null;
  views: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  /** 해시태그(`#` 제외). 팀 한국어명이 들어온다. */
  hashtags: string[];
}

/**
 * 기사 상세 (KAN-283, `GET /api/v1/articles/{articleId}`).
 *
 * 목록 카드와 거의 같은 모양이지만 별도 계약이다 — BE 응답은 기자가 단일이
 * 아니라 배열(`reporters`, `[0]`이 대표)이고, `teams` 필드가 아예 없어 팀은
 * `hashtags`의 팀 한글명에서 역산한다. 본문 문단·댓글 필드도 없어 본문은
 * `summary`(긴 요약) 한 문단이 전부다. 경계 변환이 그 차이를 전부 흡수해
 * 화면은 이 타입만 본다. 모바일 `_types/articles.ts`에 있던 것을 web
 * 이식(KAN-322)에서 승격했다.
 */
export interface ArticleDetail {
  /** BE `articleSummaryId`를 문자열로 담는다 (라우트 파라미터와 결이 같다). */
  id: string;
  /** 파싱이 어긋나 원문 트윗 전문이 그대로 들어온 행이 있다(이모지·URL 포함). */
  title: string;
  /** 긴 요약(`summary_detail`). 본문 필드가 따로 없어 이게 본문 문단이다. */
  summary: string;
  /** 루머 단계. 발행 기사의 절반이 null이다. */
  stage: RumorStage | null;
  /** 발행 시각 ISO-8601 (KST 오프셋 포함). */
  publishedAt: string;
  /** `hashtags`의 팀 한글명에서 역산한 팀 목록 — 다중이고 없을 수 있다. */
  teams: TeamCode[];
  /** 대표 이미지. 현재 발행 기사 전건이 null이라 자리를 그리지 않는 게 기본이다. */
  imageUrl: string | null;
  /** 대표 기자(BE `reporters[0]`). 배열이 비면 null. */
  reporter: ArticleReporter | null;
  /**
   * 대표 기자의 원문 트윗 링크. 원문 버튼에 쓴다. 목록과 달리 최상위 필드가
   * 아니라 기자에게 달려 온다.
   */
  sourceUrl: string | null;
  /**
   * 조회·좋아요·댓글 집계. BE가 아직 자리 구현(Noop)이라 항상 0·false다 —
   * 값은 그대로 그리고, BE가 실집계를 붙이면 화면 수정 없이 살아난다.
   */
  views: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  /** 해시태그(`#` 제외). 팀 한국어명이 들어온다. 빈 배열일 수 있다. */
  hashtags: string[];
}

/**
 * 커서 페이지네이션 한 페이지.
 *
 * BE에 총 건수도 `hasNext`도 없다. 다음 페이지 존재 여부는 `nextCursor`가
 * null인지로만 판단한다.
 */
export interface ArticleFeedPage {
  items: ArticleCard[];
  /** 서버 발급 opaque 커서. null이면 마지막 페이지. 파싱하지 말고 되돌려준다. */
  nextCursor: string | null;
}

/**
 * 서버 컴포넌트가 미리 받아 클라 캐시에 심을 첫 페이지.
 *
 * 페이지와 받은 시각을 한 덩어리로 묶는다. 시각 없이 데이터만 넘기면 캐시가
 * 묵은 데이터를 방금 받은 것으로 착각하기 때문에(아래 `fetchedAt` 참고),
 * 둘을 따로 받는 대신 한쪽만 넘길 수 없는 모양으로 둔다.
 */
export interface InitialArticleFeed {
  page: ArticleFeedPage;
  /**
   * 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점이다.
   *
   * 이 값을 안 넘기면 RQ가 캐시 엔트리를 만드는 순간을 신선도 기준으로 찍는다.
   * 그러면 화면에 오래 머문 뒤 이 값이 다시 쓰일 때(팀 탭을 오가다 엔트리가
   * 정리된 경우) 20분 묵은 데이터가 방금 받은 것으로 취급돼 갱신이 안 걸린다.
   */
  fetchedAt: number;
}

/**
 * 릴 한 장의 데이터 (KAN-276, `GET /api/v1/reels`).
 *
 * 지금은 `ArticleCard`와 필드가 같지만 타입을 따로 둔다. BE에서 두 응답이 같은
 * 이유는 릴스 큐레이션이 아직 없어 같은 쿼리를 쓰기 때문이고(be-verify 확인),
 * 릴스가 제 기준으로 갈라질 때 기사 카드를 건드리지 않으려는 것이다.
 * 모바일 `_types/reels.ts`에 있던 것을 web 이식(KAN-323)에서 승격했다.
 */
export interface ReelCard {
  /** BE `articleSummaryId`를 문자열로 담는다. */
  id: string;
  title: string;
  /** BE가 긴 요약(`summary_detail`)을 내려준다. 짧은 요약은 이 API에 없다. */
  summary: string;
  /** 루머 단계. BE 실데이터의 절반이 비어 있다. */
  stage: RumorStage | null;
  /** 발행 시각 ISO-8601. BE가 KST 오프셋(+09:00)을 박아 내려준다. */
  publishedAt: string;
  /** 태그된 팀 목록 — 다중이고 없을 수 있다. 첫 팀을 대표로 쓴다. */
  teams: TeamCode[];
  /** 릴 배경 이미지. BE 실데이터가 아직 전부 비어 있어 원문 트윗 임베드로 폴백한다. */
  imageUrl: string | null;
  /** 기자. 객체 자체가 없을 수 있고 `tier`도 절반이 비어 있다. */
  reporter: ArticleReporter | null;
  /** 원문 링크 (현재는 전부 x.com) */
  sourceUrl: string | null;
  views: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  /** 해시태그(`#` 제외). 태그된 팀의 한국어명이 들어온다. */
  hashtags: string[];
}

/**
 * 릴스 커서 페이지네이션 한 페이지.
 *
 * 총 건수도 `hasNext`도 없다. 다음 페이지 존재 여부는 `nextCursor`가 null인지로만
 * 판단한다. 마지막 페이지도 items가 꽉 차서 올 수 있어 건수로 끝을 판정하면 안 된다.
 */
export interface ReelFeedPage {
  items: ReelCard[];
  /** 서버 발급 opaque 커서. null이면 마지막 페이지. 파싱하지 말고 되돌려준다. */
  nextCursor: string | null;
}

/**
 * 서버 컴포넌트가 미리 받아 클라 캐시에 심을 릴스 첫 페이지.
 *
 * 페이지와 받은 시각을 한 덩어리로 묶는 이유는 {@link InitialArticleFeed}와 같다.
 */
export interface InitialReelFeed {
  page: ReelFeedPage;
  /** 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점이다. */
  fetchedAt: number;
}
