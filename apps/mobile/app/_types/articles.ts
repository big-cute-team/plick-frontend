/**
 * @file 기사 핫이슈·상세 타입 (KAN-282, KAN-283).
 *
 * 피드 계약 타입(`ArticleCard`·`ArticleFeedPage`·`InitialArticleFeed`)도 여기
 * 살았는데 web이 두 번째 사용처가 되면서 `@plick/domain/types`로 승격했다
 * (KAN-321, ADR 0011 게이트 C). 핫이슈·상세는 아직 모바일만 소비하므로 남아
 * 있고, web이 붙는 티켓에서 승격을 다시 판단한다.
 */

import type {
  ArticleReporter,
  RumorStage,
  TeamCode,
} from "@plick/domain/types";

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
