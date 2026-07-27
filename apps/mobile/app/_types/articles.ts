/**
 * @file 기사 피드 도메인 타입 (KAN-271, `GET /api/v1/articles`).
 *
 * `@plick/domain`의 `FeedPost`는 퍼블리싱 단계에서 BE 목표 shape를 추정해 만든
 * 타입이고, 실제 계약은 그와 여러 군데 어긋난다 — 팀이 다중이고, 단계와 기자
 * 정보가 null일 수 있고, 본문·댓글·토론은 목록 응답에 아예 없다. 그래서 목록
 * 카드는 `FeedPost`를 재사용하지 않고 실제 계약을 그대로 담는 타입을 따로 둔다.
 *
 * 아직 모바일 홈만 이 API를 쓰므로 앱 로컬에 둔다. web이 같은 shape를 두 번째로
 * 쓰게 되면 `@plick/domain` 승격을 ADR 0011 게이트로 판단한다.
 */

import type { RumorStage, TeamCode } from "@plick/domain/types";

/** 기사 원문을 낸 기자. BE는 객체 자체가 없을 수 있다. */
export interface ArticleReporter {
  /** 표시용 이름 — BE의 한국어명이 아직 전부 비어 있어 영문명으로 대체된다. */
  name: string;
  /** 1 = 최상위 신뢰. BE 실데이터의 절반이 비어 있어 null을 허용한다. */
  tier: number | null;
}

/** 피드 목록의 기사 카드 한 장. */
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
  /** 대표 이미지. BE 실데이터가 아직 전부 비어 있어 placeholder로 폴백한다. */
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
 * 홈 핫이슈 카드 한 장 (KAN-282, `GET /api/v1/articles/hot`).
 *
 * 피드 카드와 계약이 다르다 — `summary`·`hashtags`·원문 링크가 없고 이미지가
 * 단일 필드다. 그래서 `ArticleCard`를 줄여 쓰지 않고 따로 둔다.
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
  /** 대표 이미지. BE 실데이터가 아직 전부 비어 있어 placeholder로 폴백한다. */
  imageUrl: string | null;
  /**
   * 원문 링크. 사진이 null일 때 트윗 임베드 폴백에 쓴다(KAN-284) —
   * 다만 hot API는 스웨거·실응답 모두 이 필드가 아직 없어 당분간 항상 null이다.
   * BE가 필드를 추가하면 화면 수정 없이 임베드가 살아난다.
   */
  sourceUrl: string | null;
  reporter: ArticleReporter | null;
  /**
   * 조회·좋아요·댓글 집계. BE가 아직 자리 구현(Noop)이라 항상 0으로 온다 —
   * 값은 그대로 그리고, BE가 실집계를 붙이면 화면 수정 없이 살아난다.
   */
  views: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
}

/**
 * 기사 상세 (KAN-283, `GET /api/v1/articles/{articleId}`).
 *
 * 목록 카드와 거의 같은 모양이지만 별도 계약이다 — BE 응답은 기자가 단일이
 * 아니라 배열(`reporters`, `[0]`이 대표)이고, `teams` 필드가 아예 없어 팀은
 * `hashtags`의 팀 한글명에서 역산한다. 본문 문단·댓글 필드도 없어 본문은
 * `summary`(긴 요약) 한 문단이 전부다. 경계 변환이 그 차이를 전부 흡수해
 * 화면은 이 타입만 본다.
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
  /** 대표 이미지. 현재 발행 기사 전건이 null이라 트윗 임베드 폴백이 기본이다. */
  imageUrl: string | null;
  /** 대표 기자(BE `reporters[0]`). 배열이 비면 null. */
  reporter: ArticleReporter | null;
  /**
   * 대표 기자의 원문 트윗 링크. 원문 버튼과 사진 null 폴백(트윗 임베드)에
   * 쓴다(KAN-284). 목록과 달리 최상위 필드가 아니라 기자에게 달려 온다.
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
