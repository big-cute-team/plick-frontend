/**
 * @file 기사 피드·핫이슈 fetcher (KAN-271 `GET /api/v1/articles`,
 * KAN-282 `GET /api/v1/articles/hot`).
 *
 * 서버 컴포넌트(첫 페이지)와 클라 훅(팀 필터 재요청) 양쪽에서 부른다. 그래서
 * 서버 액션(`"use server"`)이 아니라 평범한 모듈이고, base URL 선택은
 * `apiFetch`가 실행 위치를 보고 알아서 한다.
 *
 * 익명 허용 공개 API다. 스웨거에는 전역 `bearerAuth`가 걸려 있어 인증이 필요한
 * 것처럼 보이지만 실제로는 토큰 없이 200이 온다. 오히려 만료된 토큰을 실으면
 * 401로 피드 전체가 죽으므로 여기서는 일부러 토큰을 싣지 않는다.
 */

import type { Filter, TeamCode } from "@plick/domain/types";
import { apiFetch } from "@/_apis/client";
import { STAGE_BY_BE_VALUE, TEAM_CODES, TEAM_IDS } from "@/_constants/api";
import type {
  ArticleCard,
  ArticleFeedPage,
  HotArticle,
} from "@/_types/articles";

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

/** 홈 "지금 올라온 소식" 한 페이지 크기. */
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

/**
 * BE 핫이슈 카드 (이 파일 로컬 — be-verify가 실제 응답으로 확인한 그대로).
 *
 * 피드 카드와 shape가 다르다. `summary`·`sourceUrl`·`hashtags`가 없고, 이미지가
 * `mainImageUrl`/`detailImageUrl` 쌍 대신 단일 `imageUrl`이며, reporter가
 * `{ enName, koName }` 쌍 대신 단일 `name`이다. `sourceUrl`은 KAN-284 시점
 * 재검증에서 스웨거·실응답 모두 없는 것으로 확인됐다 — 사진 null 폴백(트윗
 * 임베드)에 필요해서 optional로 받아 두고, BE가 추가하면 그대로 살아난다.
 */
interface HotCardResponse {
  articleSummaryId: number;
  title: string;
  rumorStage: string | null;
  publishedAt: string;
  imageUrl: string | null;
  sourceUrl?: string | null;
  teams: number[];
  logoUrl: string | null;
  reporter: {
    name: string | null;
    tier: number | null;
  } | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  likedByMe: boolean;
}

/** BE → 도메인 경계 변환. 피드 카드와 shape가 달라 `toArticleCard`를 못 쓴다. */
function toHotArticle(r: HotCardResponse): HotArticle {
  return {
    id: String(r.articleSummaryId),
    title: r.title,
    stage: r.rumorStage ? (STAGE_BY_BE_VALUE[r.rumorStage] ?? null) : null,
    publishedAt: r.publishedAt,
    // 마스터에 없는 팀 id가 섞여 오면 표시할 이름이 없으므로 버린다
    teams: r.teams
      .map((id) => TEAM_CODES[id])
      .filter((code): code is TeamCode => Boolean(code)),
    imageUrl: r.imageUrl,
    sourceUrl: r.sourceUrl ?? null,
    reporter: r.reporter?.name
      ? { name: r.reporter.name, tier: r.reporter.tier ?? null }
      : null,
    views: r.viewCount,
    commentCount: r.commentCount,
    likeCount: r.likeCount,
    liked: r.likedByMe,
  };
}

/**
 * 홈 핫이슈 캐러셀 기사 목록. 서버 컴포넌트에서 await 해 쓴다.
 *
 * 건수는 BE 기본 5건이다 (`size` 파라미터는 1..10만 유효). 선정은 최근 48시간
 * 발행분 중 조회수 상위이고 부족하면 최신순 폴백이라, 기사가 아예 없지 않는 한
 * 빈 배열이 오지 않는다. 페이지네이션은 없다.
 *
 * 피드와 같은 익명 허용 API라 토큰을 싣지 않는다 — 만료 토큰을 실으면
 * 401 `AUTH_EXPIRED_TOKEN`으로 오히려 죽는다.
 */
export async function getHotArticles(): Promise<HotArticle[]> {
  const cards = await apiFetch<HotCardResponse[]>("/api/v1/articles/hot");
  return cards.map(toHotArticle);
}
