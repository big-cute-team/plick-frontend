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
  /**
   * URL용 영문 slug (예: tottenham) — 팀 허브 라우트 `/teams/[slug]`와
   * sitemap이 쓴다 (KAN-350). 검색 친화적 풀네임 표기라 코드 소문자와 다르다.
   */
  slug: string;
  /** theme.css의 팀 컬러 CSS 변수명 (예: --plk-team-liv) */
  colorVar: string;
}

/** 루머 신뢰 단계. */
export type RumorStage = "RUMOUR" | "IN_PROGRESS" | "CONFIRMED" | "OFFICIAL";

/**
 * 내 프로필 — `GET /users/me`를 화면 소비 형태로 좁힌 것 (KAN-267).
 * 온보딩 전엔 닉네임이, 카카오·애플 가입이면 이메일이 없다. 응원팀은 다중 선택이라
 * 배열 그대로 두고, BE 팀 항목을 팀 코드로만 좁힌다(각 앱 `_services/profile.ts`).
 * 모바일 `_types/api.ts`에 있던 것을 web 이식(KAN-319)에서 승격했다.
 */
export interface MyProfile {
  /** BE `userId`. 내 댓글 판별(작성자 id 대조)에 쓴다 — KAN-411에서 추가. */
  userId: number;
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
 * 자기 원문 링크를 든 기자 (KAN-365, `GET /api/v1/articles/{articleId}`).
 *
 * 상세 응답의 `reporters` 배열 항목이다 — 목록·핫이슈와 달리 상세는 기사 하나에
 * 기자가 여럿 실리고, 원문 트윗 링크가 최상위 필드가 아니라 기자마다 달려 온다.
 */
export interface ArticleSourceReporter extends ArticleReporter {
  /** 이 기자의 원문 트윗 링크. 실데이터에 비어 오는 행이 있어 null을 허용한다. */
  sourceUrl: string | null;
}

/**
 * 피드 목록의 기사 카드 한 장 (KAN-271, `GET /api/v1/articles`).
 *
 * 퍼블리싱 단계에서 BE 목표 shape를 추정해 만든 `FeedPost`가 따로 있었지만
 * 실제 계약과 여러 군데 어긋났다 — 팀이 다중이고, 단계와 기자 정보가 null일 수
 * 있고, 본문·댓글·토론은 목록 응답에 아예 없다. 그래서 목록 카드는 실제 계약을
 * 그대로 담고, `FeedPost`는 마지막 소비자(웹 사이드바 목데이터)가 사라지면서
 * 함께 삭제됐다(KAN-338). 모바일 `_types/articles.ts`에 있던 것을 web
 * 이식(KAN-321)에서 승격했다.
 */
export interface ArticleCard {
  /** BE `articleSummaryId`를 문자열로 담는다 (라우트 파라미터와 결이 같다). */
  id: string;
  /**
   * 게시물 표시 형태 (KAN-438). BE 목록 응답에는 토론 기능(KAN-418)부터 실려
   * 있었지만 목록 계약이 KAN-271 시점 shape라 버려지고 있었다. DEBATE면
   * 리스트가 투표 진행 중 표시(글로우·칩)를 단다 — 목록 응답에 `closesAt`이
   * 없어 시간 경과 판정은 하지 않고, BE 열림/마감 실기준인 이 값만 본다.
   */
  contentType: ArticleContentType;
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
  /**
   * 게시물 표시 형태 (KAN-418). FINISH면 이 기사의 토론이 마감된 것이다 —
   * 토론 응답에는 상태가 없어 투표 카드의 마감 판정을 이 값으로 한다.
   */
  contentType: ArticleContentType;
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
  /**
   * 기사에 실린 기자 전원(대표 순서, `[0]`이 대표). BE `reporters`는 같은 기자가
   * 트윗을 여러 개 내면 그 수만큼 행이 오는데, 경계 변환이 이름 기준으로 중복을
   * 걷고 기자당 최신 원문 한 건만 남긴다. 원문 트윗 링크는 최상위 필드가 아니라
   * 기자마다 달려 온다. 빈 배열일 수 있다(그때는 기자 줄이 빠진다).
   * 단일 대표만 노출하다 KAN-365에서 전원 노출로 바꿨다.
   */
  reporters: ArticleSourceReporter[];
  /**
   * 조회·좋아요·댓글 집계. KAN-283 시점에는 BE 자리 구현(Noop) 때문에 항상 0·false였지만
   * 지금은 요청마다 실집계가 돌아 실값이 온다(KAN-324 재검증). `liked`는 토큰을 실었을
   * 때만 그 유저 기준으로 계산된다.
   */
  views: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  /** 해시태그(`#` 제외). 팀 한국어명이 들어온다. 빈 배열일 수 있다. */
  hashtags: string[];
}

/**
 * 홈 핫이슈 카드 한 장 (KAN-282, `GET /api/v1/articles/hot`).
 *
 * 피드 카드와 계약이 다르다 — `summary`·`hashtags`·원문 링크가 없고 이미지가
 * 단일 필드다. 그래서 `ArticleCard`를 줄여 쓰지 않고 따로 둔다. 모바일
 * `_types/articles.ts`에 있던 것을 web 이식(KAN-324)에서 승격했다.
 */
export interface HotArticle {
  /** BE `articleSummaryId`를 문자열로 담는다 (`ArticleCard.id`와 결이 같다). */
  id: string;
  title: string;
  /** 루머 단계. null이면 배지를 그리지 않는다. */
  stage: RumorStage | null;
  /** 발행 시각 ISO-8601 (KST 오프셋 포함). */
  publishedAt: string;
  /** 태그된 팀 목록 — 다중이고 없을 수 있다. 첫 팀을 대표로 쓴다. */
  teams: TeamCode[];
  /** 대표 이미지. BE 실데이터가 아직 전부 비어 있어 없으면 트윗 임베드로 폴백한다. */
  imageUrl: string | null;
  /**
   * 대표 원문 링크(현재는 전부 x.com). 사진이 null일 때 트윗 임베드 폴백에 쓴다.
   *
   * KAN-282·KAN-284 시점에는 이 키가 응답에 아예 없어 화면이 폴백을 타지 못했는데,
   * BE가 2026-07-24에 최상위 필드로 추가했다(web 이식 KAN-324 재검증에서 확인).
   * 대표 원문이 없으면 null이라 가드는 남긴다 — `reporter`와 같은 조건이라 둘은
   * 항상 함께 null이 된다.
   */
  sourceUrl: string | null;
  reporter: ArticleReporter | null;
  /**
   * 조회·좋아요·댓글 집계. KAN-282 시점에는 BE 자리 구현(Noop) 때문에 항상 0이었지만
   * 지금은 요청마다 실집계가 돌아 실값이 온다(KAN-324 재검증). 값이 작아서 천 단위
   * 축약이 눈에 띄지 않을 뿐이다.
   *
   * `liked`는 토큰을 실었을 때만 그 유저 기준으로 계산된다. 핫이슈 fetcher는 만료
   * 토큰 401을 피하려고 토큰을 싣지 않으므로(`getHotArticles`) 늘 false다 — 핫이슈
   * 카드가 하트를 그리지 않는 이유이기도 하다.
   */
  views: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
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
  /**
   * 게시물 표시 형태 (KAN-418). 릴에 토론이 붙어 있으면 이 값이 투표 가능
   * 여부의 실기준이다 — DEBATE는 투표 UI, FINISH는 결과 읽기 전용.
   */
  contentType: ArticleContentType;
  /**
   * 이 릴에 붙은 토론 (KAN-418). 릴스는 목록 응답에 토론이 통째로 인라인돼
   * 별도 조회가 없다 — 기사 상세가 `GET /articles/{id}/debate`를 따로 부르는
   * 것과 다르다. 마감(FINISH) 릴도 인라인으로 오고(KAN-420) 토론 없는
   * 게시물(GENERAL)만 null이다.
   */
  debate: Debate | null;
}

/**
 * 게시물 표시 형태 (KAN-418, BE `article_summaries.content_type` enum 그대로).
 *
 * DEBATE가 열린 토론, FINISH가 마감된 토론이다 — 토론의 열림/마감 판정 실기준은
 * `closesAt` 시각이 아니라 이 값이다(BE `DebateService` 확인). 마감(FINISH)
 * 기사는 토론 리스트(`GET /debates`)에서만 빠지고, 릴스 카드에는 `debate`가
 * 인라인으로 온다(KAN-420).
 */
export type ArticleContentType = "GENERAL" | "DEBATE" | "FINISH";

/**
 * 투표 선택지 식별자 (KAN-418, BE enum 문자열 그대로).
 * BE `debates` 테이블이 선택지를 A/B 두 컬럼으로 고정해 두 개뿐이다.
 */
export type VoteOption = "OPTION_A" | "OPTION_B";

/**
 * 토론(투표) 한 건 (KAN-418, `GET /api/v1/articles/{articleId}/debate` ·
 * `GET /api/v1/reels`의 `debate` 필드).
 *
 * 기사 하나에 토론이 최대 하나 붙는 구조다. 마감 여부는 이 응답에 없다 —
 * 실기준이 기사의 {@link ArticleContentType}(FINISH = 마감)이기 때문으로,
 * 기사 상세와 릴 세부가 각자 `contentType`으로 판정해 화면에 넘긴다.
 * 토론 리스트(`GET /debates`)에는 열린 토론만 오므로 판정할 일이 없다.
 */
export interface Debate {
  /** BE `debateId`. 투표 엔드포인트의 path 파라미터라 문자열로 담는다. */
  id: string;
  /** 투표 질문 (예: "6,000만 유로, 디오망드에 지를 만한가?") */
  topic: string;
  optionA: string;
  optionB: string;
  /**
   * 마감 시각 ISO-8601 (KST 오프셋). null이면 남은 시간 표기를 생략한다.
   * 표시용 힌트일 뿐 마감 판정 기준이 아니다 — BE는 목록 필터도 투표 차단도
   * 기사 `contentType`으로만 본다.
   */
  closesAt: string | null;
  voteCountA: number;
  voteCountB: number;
  /** 내 투표. 비로그인·미투표면 null. 결과 공개는 이 값(또는 마감)이 게이트다. */
  myVote: VoteOption | null;
}

/**
 * 토론 리스트 한 건 (KAN-418, `GET /api/v1/debates`).
 *
 * 리스트 전용으로 소속 기사 id가 붙는다 — 카드 클릭 시 기사 상세로 보내는 데
 * 쓴다. 팀·기사 제목 같은 부가 정보는 응답에 없다(리스트 카드가 질문만 보여주는
 * 이유). 페이지네이션 없는 순수 배열로 온다.
 */
export interface DebateListItem extends Debate {
  /** 소속 기사 id — 릴스·기사의 `articleSummaryId`와 같은 체계를 문자열로. */
  articleId: string;
}

/**
 * 서버 컴포넌트가 미리 받아 클라 캐시에 심을 토론 리스트.
 *
 * 시각을 같이 묶는 이유는 {@link InitialArticleFeed}와 같다.
 */
export interface InitialDebateList {
  items: DebateListItem[];
  /** 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점. */
  fetchedAt: number;
}

/**
 * 투표 후 집계 상태. 낙관적 갱신도 롤백도 이 덩어리를 통째로 바꾼다 —
 * 좋아요의 {@link LikeState}와 같은 역할이다.
 */
export interface DebateVoteState {
  voteCountA: number;
  voteCountB: number;
  myVote: VoteOption | null;
}

/**
 * 투표 서버 액션의 결과. 값으로 돌려주는 이유는 {@link CreateCommentResult}와
 * 같다. 성공이면 BE가 계산한 최신 집계가 온다 — 낙관적으로 옮긴 카운트를 이걸로
 * 덮어 다른 사람 표까지 반영한다. 재투표는 에러가 아니라 입장 변경이다.
 */
export type VoteDebateResult =
  | { ok: true; result: DebateVoteState }
  | { ok: false; status: number; code: string; message: string };

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

/**
 * 댓글 한 건 (+대댓글) — `GET·POST /api/v1/articles/{articleId}/comments`의 실계약
 * (모바일 KAN-303, web 이식 KAN-329).
 *
 * 퍼블리싱 때 추정으로 만든 `Comment`를 대체한다. 작성자가 핸들이 아니라 닉네임이고,
 * 시각이 표시 문자열이 아니라 ISO이며, 삭제 tombstone과 수정 여부 플래그가 있다.
 *
 * 릴스와 기사 세부가 같은 댓글을 본다 — BE comments가 `article_summary_id`에 걸려
 * 있어 릴 카드 id로도 같은 목록이 온다.
 */
export interface ArticleComment {
  /** BE `commentId`. 라우트에 안 쓰여 숫자 그대로 둔다. */
  id: number;
  /**
   * 작성자 유저 id — `GET /users/me`의 `userId`와 같은 체계 (KAN-411에서 BE가
   * 추가). 내 댓글 판별과 차단 대상 식별에 쓴다. 삭제·차단 마스킹 댓글에도
   * 원본 그대로 유지된다.
   */
  userId: number;
  /** 작성자 표시명. BE가 닉네임 하나만 준다(아바타·핸들 없음). 삭제돼도 유지된다. */
  nickname: string;
  /** 본문. 삭제된 댓글(tombstone)이면 null — `isDeleted`와 짝으로 분기한다. */
  content: string | null;
  /** 작성 시각 ISO-8601 (KST 오프셋 포함). 화면은 상대 시각으로 바꿔 그린다. */
  createdAt: string;
  isEdited: boolean;
  /**
   * 삭제 여부. 삭제돼도 목록에서 사라지지 않고 tombstone으로 남는다 —
   * 대댓글이 딸린 원 댓글을 지워도 답글은 계속 보여야 하기 때문.
   * 단 `commentCount` 집계에서는 빠져서 헤더 숫자와 목록 행수가 다를 수 있다.
   */
  isDeleted: boolean;
  /**
   * 운영자 블라인드 여부 (KAN-411). 신고를 운영자가 부적절 판정하면 서게 되고,
   * 모두에게 원문 대신 안내 문구를 보여야 한다. 판정은 어드민 몫이라 화면은
   * 표시 분기만 한다.
   */
  isBlinded: boolean;
  /**
   * 내가 차단한 사용자의 댓글인지 (KAN-411). 서버가 목록에서 빼지 않고 이
   * 플래그 + 마스킹된 `content`("차단한 사용자의 댓글입니다")로 내려준다 —
   * 화면은 클라 필터링 없이 이 플래그로 안내 문구만 그린다. 토큰을 안 실은
   * 조회에서는 항상 false다.
   */
  isBlocked: boolean;
  likeCount: number;
  /** 내가 좋아요를 눌렀는지. 토큰을 안 실은 조회에서는 항상 false다. */
  liked: boolean;
  /** 대댓글 — 부모에 통째로 인라인(오래된순). 커서 페이지 계산에서 빠진다. */
  replies: ArticleComment[];
}

/**
 * 댓글 커서 페이지네이션 한 페이지. 기사 피드({@link ArticleFeedPage})와 같은
 * 규약이다 — 총 건수도 `hasNext`도 없고 `nextCursor`가 null인지로만 끝을 판단한다.
 */
export interface CommentPage {
  items: ArticleComment[];
  /** 서버 발급 opaque 커서. null이면 마지막 페이지. 파싱하지 말고 되돌려준다. */
  nextCursor: string | null;
}

/**
 * 서버 컴포넌트가 미리 받아 클라 캐시에 심을 댓글 첫 페이지.
 *
 * 시각을 같이 묶는 이유는 {@link InitialArticleFeed}와 같다 — 신선도 기준점 없이
 * 데이터만 넘기면 묵은 씨앗이 방금 받은 것으로 취급된다.
 */
export interface InitialCommentPage {
  page: CommentPage;
  /** 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점. */
  fetchedAt: number;
}

/**
 * 댓글 작성 서버 액션의 결과. 서버 액션은 던진 에러의 메시지를 프로덕션에서
 * 가려 버리므로(`ApiError` 인스턴스도 경계를 못 넘는다) 값으로 돌려주고,
 * 클라 훅이 다시 `ApiError`로 되살린다.
 */
export type CreateCommentResult =
  | { ok: true; comment: ArticleComment }
  | { ok: false; status: number; code: string; message: string };

/**
 * 댓글 수정 서버 액션의 결과. 값으로 돌려주는 이유는 {@link CreateCommentResult}와
 * 같다. 성공이면 BE가 돌려준 수정 반영본 한 건(`isEdited: true`)이 온다.
 */
export type UpdateCommentResult =
  | { ok: true; comment: ArticleComment }
  | { ok: false; status: number; code: string; message: string };

/**
 * 댓글 삭제 서버 액션의 결과. BE가 성공 시 `data: null`만 주므로 실을 값이 없다 —
 * 삭제 후 목록 반영(tombstone)은 클라 캐시가 직접 한다.
 */
export type DeleteCommentResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/**
 * 좋아요 한 건의 표시 상태. 낙관적 갱신도 롤백도 이 덩어리를 통째로 바꾼다.
 *
 * 기사(릴)와 댓글은 엔드포인트가 다르지만 계약이 같다 — 등록·취소 모두 멱등이고
 * 응답은 최신 카운트 하나이며 실패 규약도 같다. 그래서 도메인별로 나누지 않는다.
 */
export interface LikeState {
  liked: boolean;
  likeCount: number;
}

/**
 * 좋아요 등록·취소 서버 액션의 결과. 값으로 돌려주는 이유는
 * {@link CreateCommentResult}와 같다.
 *
 * 성공이면 BE가 계산한 최신 좋아요 수가 온다 — 낙관적으로 ±1 한 값을 이걸로
 * 덮어 다른 사람이 그 사이 누른 것까지 반영한다.
 */
export type ToggleLikeResult =
  | { ok: true; likeCount: number }
  | { ok: false; status: number; code: string; message: string };

/**
 * 댓글 신고 사유 (KAN-411, `POST /api/v1/comments/{commentId}/report`).
 * BE enum 문자열 그대로다 — 화면 라벨 매핑은 `COMMENT_REPORT_REASONS`(constants).
 */
export type CommentReportReason =
  | "SPAM"
  | "ABUSE"
  | "HARASSMENT"
  | "SEXUAL"
  | "ETC";

/**
 * 댓글 신고 서버 액션의 결과. BE가 성공 시 `data: null`만 주므로 실을 값이 없고,
 * 값으로 돌려주는 이유는 {@link CreateCommentResult}와 같다. 처리(블라인드 판정)는
 * 운영자 몫이라 신고해도 댓글 표시는 그대로다.
 */
export type ReportCommentResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/**
 * 차단 목록 한 건 — `GET /api/v1/users/me/blocks`의 실계약 (KAN-411, be-verify
 * 확인). 페이지네이션 없는 순수 배열로 오고 프로필 이미지 필드는 없다.
 */
export interface BlockedUser {
  userId: number;
  nickname: string;
  /** 차단한 시각 ISO-8601 (KST 오프셋 포함). 최근 차단순 정렬의 기준. */
  blockedAt: string;
}

/**
 * 사용자 차단·해제 서버 액션의 결과. 두 동작 모두 성공 응답이 `data: null`이고
 * 실패 규약도 같아 좋아요({@link ToggleLikeResult})처럼 하나로 쓴다.
 * 재차단·미차단 해제 모두 200(멱등)이라 실패는 사실상 인증·네트워크뿐이다.
 */
export type ToggleBlockResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };
