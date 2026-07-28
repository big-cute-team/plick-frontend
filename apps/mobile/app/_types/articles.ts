/**
 * @file 기사 핫이슈 타입 (KAN-282).
 *
 * 피드 계약 타입(`ArticleCard`·`ArticleFeedPage`·`InitialArticleFeed`)과 상세
 * 계약 타입(`ArticleDetail`)도 여기 살았는데 web이 두 번째 사용처가 되면서
 * 각각 KAN-321, KAN-322에 `@plick/domain/types`로 승격했다(ADR 0011 게이트 C).
 * 핫이슈는 아직 모바일만 소비하므로 남아 있고, web이 붙는 티켓에서 승격을
 * 다시 판단한다.
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
