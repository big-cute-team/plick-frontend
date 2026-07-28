/**
 * @file 기사 피드 fetcher (KAN-271 `GET /api/v1/articles`).
 *
 * 모바일 `_services/articles.ts`로 살다 web 홈·기사 페이지가 두 번째 사용처가
 * 되면서 피드 부분만 승격했다(KAN-321, ADR 0011 게이트 C). 핫이슈·상세 fetcher는
 * 아직 모바일만 쓰므로 그쪽에 남아 있고, web이 붙는 티켓에서 따라 올라온다.
 *
 * 서버 컴포넌트(첫 페이지)와 클라 훅(팀 필터 재요청) 양쪽에서 부른다. 그래서
 * 서버 액션(`"use server"`)이 아니라 평범한 모듈이고, base URL 선택은
 * `apiFetch`가 실행 위치를 보고 알아서 한다.
 *
 * 익명 허용 공개 API다. 스웨거에는 전역 `bearerAuth`가 걸려 있어 인증이 필요한
 * 것처럼 보이지만 실제로는 토큰 없이 200이 온다. 오히려 만료된 토큰을 실으면
 * 401로 피드 전체가 죽으므로 여기서는 일부러 토큰을 싣지 않는다.
 */

import {
  STAGE_BY_BE_VALUE,
  TEAM_CODES,
  TEAM_IDS,
} from "@plick/domain/constants";
import type {
  ArticleCard,
  ArticleFeedPage,
  Filter,
  TeamCode,
} from "@plick/domain/types";
import { apiFetch } from "./client";

/** BE 응답 카드 (이 파일 로컬 — be-verify가 실제 응답으로 확인한 그대로). */
interface FeedCardResponse {
  articleSummaryId: number;
  title: string;
  summary: string;
  rumorStage: string | null;
  publishedAt: string;
  mainImageUrl: string | null;
  detailImageUrl: string | null;
  teams: number[];
  logoUrl: string | null;
  reporter: {
    enName: string | null;
    koName: string | null;
    tier: number | null;
  } | null;
  sourceUrl: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  likedByMe: boolean;
  hashtags: string[];
}

interface ArticleFeedResponse {
  items: FeedCardResponse[];
  nextCursor: string | null;
}

/** BE가 한 번에 내려주는 최대 건수. 이보다 크면 400이다. */
export const ARTICLES_MAX_PAGE_SIZE = 30;

/** "지금 올라온 소식"·기사 리스트 한 페이지 크기. */
export const ARTICLES_PAGE_SIZE = 10;

/**
 * BE → 도메인 경계 변환. 필드명·철자·null 차이를 전부 여기서 흡수한다.
 * 화면은 `ArticleCard`만 보고 BE 응답 모양을 모른다.
 */
function toArticleCard(r: FeedCardResponse): ArticleCard {
  const reporterName = r.reporter?.koName ?? r.reporter?.enName ?? null;

  return {
    id: String(r.articleSummaryId),
    title: r.title,
    summary: r.summary,
    stage: r.rumorStage ? (STAGE_BY_BE_VALUE[r.rumorStage] ?? null) : null,
    publishedAt: r.publishedAt,
    // 마스터에 없는 팀 id가 섞여 오면 표시할 이름이 없으므로 버린다
    teams: r.teams
      .map((id) => TEAM_CODES[id])
      .filter((code): code is TeamCode => Boolean(code)),
    imageUrl: r.mainImageUrl ?? r.detailImageUrl,
    reporter: reporterName
      ? { name: reporterName, tier: r.reporter?.tier ?? null }
      : null,
    sourceUrl: r.sourceUrl,
    views: r.viewCount,
    commentCount: r.commentCount,
    likeCount: r.likeCount,
    liked: r.likedByMe,
    hashtags: r.hashtags,
  };
}

/**
 * 기사 피드 한 페이지를 가져온다.
 *
 * @param team 팀 필터. `"ALL"`이면 파라미터를 싣지 않아 전체가 온다.
 * @param cursor 이전 페이지가 준 `nextCursor`. 첫 페이지면 null.
 * @param size 한 페이지 건수 (1..30)
 * @throws {ApiError} 잘못된 파라미터·커서는 400 `COMMON_INVALID_PARAM`으로 온다
 */
export async function getArticles({
  team = "ALL",
  cursor = null,
  size = ARTICLES_PAGE_SIZE,
}: {
  team?: Filter;
  cursor?: string | null;
  size?: number;
} = {}): Promise<ArticleFeedPage> {
  const params = new URLSearchParams({ size: String(size) });
  if (team !== "ALL") params.set("teamId", String(TEAM_IDS[team]));
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<ArticleFeedResponse>(
    `/api/v1/articles?${params}`,
  );

  return {
    items: page.items.map(toArticleCard),
    nextCursor: page.nextCursor,
  };
}
