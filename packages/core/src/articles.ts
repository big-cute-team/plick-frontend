/**
 * @file 기사 피드·상세 fetcher (KAN-271 `GET /api/v1/articles`,
 * KAN-283 `GET /api/v1/articles/{articleId}`).
 *
 * 모바일 `_services/articles.ts`로 살다 web이 두 번째 사용처가 되면서 피드는
 * KAN-321에, 상세는 KAN-322에 승격했다(ADR 0011 게이트 C). 핫이슈 fetcher는
 * 아직 모바일만 쓰므로 그쪽에 남아 있고, web이 붙는 티켓에서 따라 올라온다.
 *
 * 서버 컴포넌트(첫 페이지)와 클라 훅(팀 필터 재요청) 양쪽에서 부른다. 그래서
 * 서버 액션(`"use server"`)이 아니라 평범한 모듈이고, base URL 선택은
 * `apiFetch`가 실행 위치를 보고 알아서 한다.
 *
 * 익명 허용 공개 API다. 스웨거에는 전역 `bearerAuth`가 걸려 있어 인증이 필요한
 * 것처럼 보이지만 실제로는 토큰 없이 200이 온다. 오히려 만료된 토큰을 실으면
 * 401로 피드 전체가 죽으므로 피드에서는 일부러 토큰을 싣지 않는다(상세만
 * `likedByMe` 때문에 있을 때 싣는다 — {@link getArticle}).
 */

import {
  STAGE_BY_BE_VALUE,
  TEAM_BY_KO_NAME,
  TEAM_CODES,
  TEAM_IDS,
} from "@plick/domain/constants";
import type {
  ArticleCard,
  ArticleDetail,
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

/**
 * BE 상세 응답 (이 파일 로컬 — be-verify가 실제 응답으로 확인한 그대로).
 *
 * 목록·핫이슈와 또 다른 세 번째 shape다. 기자가 단일 객체가 아니라 배열이고
 * (대표 순서 정렬, `[0]`이 대표), 원문 링크가 최상위가 아니라 기자마다 달려
 * 오며, `teams` id 배열이 아예 없다. 좋아요·댓글·조회는 BE Noop 구현이라
 * 항상 0·false로 온다.
 */
interface ArticleDetailResponse {
  articleSummaryId: number;
  title: string;
  summary: string;
  imageUrl: string | null;
  reporters: {
    name: string;
    tier: number | null;
    sourceUrl: string;
  }[];
  publishedAt: string;
  rumorStage: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  likedByMe: boolean;
  hashtags: string[];
}

/**
 * BE → 도메인 경계 변환. 상세엔 `teams`가 없어 해시태그의 팀 한글명을
 * 역산한다 — 선수명 등 팀이 아닌 태그는 매핑에 없어 자연히 걸러진다.
 */
function toArticleDetail(r: ArticleDetailResponse): ArticleDetail {
  const lead = r.reporters[0] ?? null;

  return {
    id: String(r.articleSummaryId),
    title: r.title,
    summary: r.summary,
    stage: r.rumorStage ? (STAGE_BY_BE_VALUE[r.rumorStage] ?? null) : null,
    publishedAt: r.publishedAt,
    teams: r.hashtags
      .map((tag) => TEAM_BY_KO_NAME[tag])
      .filter((code): code is TeamCode => Boolean(code)),
    imageUrl: r.imageUrl,
    reporter: lead ? { name: lead.name, tier: lead.tier } : null,
    sourceUrl: lead?.sourceUrl ?? null,
    views: r.viewCount,
    commentCount: r.commentCount,
    likeCount: r.likeCount,
    liked: r.likedByMe,
    hashtags: r.hashtags,
  };
}

/**
 * 기사 상세 한 건. 기사 세부 페이지 서버 컴포넌트에서 await 해 쓴다.
 *
 * 익명 허용 API라 토큰 없이도 200이 온다. 다만 좋아요를 붙이면서(KAN-308)
 * 토큰이 있으면 싣게 됐다 — 응답의 `likedByMe`는 토큰이 있을 때만 그 유저
 * 기준으로 계산되고, 없으면 항상 false라 새로고침 뒤 하트가 빈 채로 남는다.
 * 만료 토큰으로 401을 맞을 걱정은 없다(각 앱 `_services/session.ts`의
 * `getAccessToken` 참고 — access 쿠키 수명이 곧 토큰 수명이라 만료되면
 * 쿠키째 사라져 익명으로 부른다).
 *
 * @param articleId 라우트 파라미터 그대로의 기사 id (BE는 int64 정수)
 * @param accessToken 로그인 중이면 access 토큰. 없으면 익명으로 부른다
 * @throws {ApiError} 없는 id·미발행 기사는 404 `ARTICLE_NOT_FOUND`로 온다 —
 *   삭제·미발행 딥링크의 정상 경로라 호출부가 잡아 not-found로 보낸다.
 *   정수가 아닌 id는 400 `COMMON_INVALID_PARAM`.
 */
export async function getArticle(
  articleId: string,
  accessToken?: string,
): Promise<ArticleDetail> {
  const detail = await apiFetch<ArticleDetailResponse>(
    `/api/v1/articles/${encodeURIComponent(articleId)}`,
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );
  return toArticleDetail(detail);
}
