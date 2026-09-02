/**
 * @file 기사 피드·상세·핫이슈 fetcher (KAN-271 `GET /api/v1/articles`,
 * KAN-283 `GET /api/v1/articles/{articleId}`, KAN-282 `GET /api/v1/articles/hot`).
 *
 * 모바일 `_services/articles.ts`로 살다 web이 두 번째 사용처가 되면서 피드는
 * KAN-321에, 상세는 KAN-322에, 핫이슈는 KAN-324에 승격했다(ADR 0011 게이트 C).
 *
 * 서버 컴포넌트(첫 페이지)와 클라 훅(팀 필터 재요청) 양쪽에서 부른다. 그래서
 * 서버 액션(`"use server"`)이 아니라 평범한 모듈이고, base URL 선택은
 * `apiFetch`가 실행 위치를 보고 알아서 한다.
 *
 * 익명 허용 공개 API다. 스웨거에는 전역 `bearerAuth`가 걸려 있어 인증이 필요한
 * 것처럼 보이지만 실제로는 토큰 없이 200이 온다. 오히려 만료된 토큰을 실으면
 * 401로 피드 전체가 죽으므로 피드와 핫이슈는 일부러 토큰을 싣지 않는다(상세만
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
  ArticleSourceReporter,
  Filter,
  HotArticle,
  TeamCode,
} from "@plick/domain/types";
import { apiFetch } from "./client";

/** BE 응답 카드 (이 파일 로컬 — be-verify가 실제 응답으로 확인한 그대로). */
interface FeedCardResponse {
  articleSummaryId: number;
  title: string;
  summary: string;
  rumorStage: string | null;
  /** 게시물 표시 형태 (KAN-438) — "GENERAL" | "DEBATE" | "FINISH". */
  contentType: string | null;
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
    // 모르는 값이 와도 화면이 투표 표시로 튀지 않게 GENERAL로 떨어뜨린다
    contentType:
      r.contentType === "DEBATE" || r.contentType === "FINISH"
        ? r.contentType
        : "GENERAL",
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
 * 오며, `teams` id 배열이 아예 없다. 좋아요·댓글·조회는 KAN-283 때는 BE Noop
 * 구현이라 항상 0·false였는데 지금은 실집계가 온다(KAN-324 재검증).
 */
interface ArticleDetailResponse {
  articleSummaryId: number;
  title: string;
  summary: string;
  /** 게시물 표시 형태 (KAN-418) — "GENERAL" | "DEBATE" | "FINISH". */
  contentType: string | null;
  imageUrl: string | null;
  reporters: {
    name: string;
    tier: number | null;
    /** 확인 시점엔 전건 값이 있었지만 tier처럼 비어 올 수 있다고 보고 눕혀 둔다. */
    sourceUrl: string | null;
  }[];
  publishedAt: string;
  rumorStage: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  likedByMe: boolean;
  hashtags: string[];
}

/** x.com 원문 링크의 스테이터스 id. 링크가 없거나 형태가 다르면 null. */
function tweetId(url: string | null): bigint | null {
  const id = url?.match(/\/status\/(\d+)/)?.[1];
  return id ? BigInt(id) : null;
}

/**
 * 기자 중복 제거 (KAN-365). 같은 기자가 원문 트윗을 여러 개 내면 상세 응답에
 * 그 수만큼 행이 오는데, 화면은 기자당 한 행만 보여주므로 이름 기준으로 걷고
 * 최신 트윗 한 건만 남긴다 — x.com 스테이터스 id는 스노플레이크(시간 순 증가)라
 * 숫자 비교가 곧 시간 비교다. 둘 중 한쪽이라도 id를 못 읽으면 앞선 행을 둔다.
 * Map은 같은 키를 덮어써도 삽입 순서를 지키므로 대표(`[0]`)는 그대로 첫 자리다.
 *
 * 실데이터 링크에 뒤공백이 섞여 와서(`"…255 "`) 그대로 href에 넣으면 %20이
 * 붙으므로 여기서 다듬고, 빈 문자열은 null로 눕힌다.
 */
function dedupeReporters(
  reporters: ArticleDetailResponse["reporters"],
): ArticleSourceReporter[] {
  const byName = new Map<string, ArticleSourceReporter>();
  for (const rep of reporters) {
    const next: ArticleSourceReporter = {
      name: rep.name,
      tier: rep.tier,
      sourceUrl: rep.sourceUrl?.trim() || null,
    };
    const prev = byName.get(next.name);
    if (!prev) {
      byName.set(next.name, next);
      continue;
    }
    const prevId = tweetId(prev.sourceUrl);
    const nextId = tweetId(next.sourceUrl);
    if (prevId != null && nextId != null && nextId > prevId) {
      byName.set(next.name, next);
    }
  }
  return [...byName.values()];
}

/**
 * BE → 도메인 경계 변환. 상세엔 `teams`가 없어 해시태그의 팀 한글명을
 * 역산한다 — 선수명 등 팀이 아닌 태그는 매핑에 없어 자연히 걸러진다.
 * 기자는 중복을 걷어 전원을 넘긴다({@link dedupeReporters}, KAN-365).
 */
function toArticleDetail(r: ArticleDetailResponse): ArticleDetail {
  return {
    id: String(r.articleSummaryId),
    title: r.title,
    summary: r.summary,
    // 모르는 값이 와도 화면이 마감 처리로 튀지 않게 GENERAL로 떨어뜨린다
    contentType:
      r.contentType === "DEBATE" || r.contentType === "FINISH"
        ? r.contentType
        : "GENERAL",
    stage: r.rumorStage ? (STAGE_BY_BE_VALUE[r.rumorStage] ?? null) : null,
    publishedAt: r.publishedAt,
    teams: r.hashtags
      .map((tag) => TEAM_BY_KO_NAME[tag])
      .filter((code): code is TeamCode => Boolean(code)),
    imageUrl: r.imageUrl,
    reporters: dedupeReporters(r.reporters),
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

/**
 * BE 핫이슈 카드 (이 파일 로컬 — be-verify가 실제 응답으로 확인한 그대로).
 *
 * 피드 카드와 shape가 다르다. `summary`·`hashtags`가 없고, 이미지가
 * `mainImageUrl`/`detailImageUrl` 쌍 대신 단일 `imageUrl`이며, reporter가
 * `{ enName, koName }` 쌍 대신 단일 `name`이다.
 *
 * `sourceUrl`은 KAN-282·KAN-284 때는 키 자체가 없었는데 BE가 2026-07-24에
 * 최상위 필드로 추가했다(KAN-324 재검증). 대표 원문 선정 규칙은 피드와 같고,
 * 대표 원문이 없으면 null이다. 스웨거 `Reporter` 스키마에 아직 `sourceUrl`이
 * 보이는 건 springdoc이 이름이 같은 상세·핫이슈 record를 스키마 하나로 합친
 * 것이고, 핫이슈 `reporter`에는 그 키가 오지 않는다.
 */
interface HotCardResponse {
  articleSummaryId: number;
  title: string;
  rumorStage: string | null;
  publishedAt: string;
  imageUrl: string | null;
  sourceUrl: string | null;
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
    sourceUrl: r.sourceUrl,
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
 * 홈 핫이슈 기사 목록. 서버 컴포넌트에서 await 해 쓴다.
 *
 * 건수는 BE 기본 5건이다 (`size` 파라미터는 1..10만 유효). 선정은 최근 48시간
 * 발행분 중 조회수 상위이고 부족하면 최신순 폴백이라, 기사가 아예 없지 않는 한
 * 빈 배열이 오지 않는다. 페이지네이션은 없다.
 *
 * 모바일·웹 모두 캐러셀로 넘기고(KAN-338) 사이드바 실시간 인기도 같은 데이터를
 * 쓴다 — 표시 건수는 표면이 잘라 쓰는 몫이라 fetcher는 BE 기본값을 그대로 돌려준다.
 *
 * 피드와 같은 익명 허용 API라 토큰을 싣지 않는다 — 만료 토큰을 실으면
 * 401 `AUTH_EXPIRED_TOKEN`으로 오히려 죽는다.
 */
export async function getHotArticles(): Promise<HotArticle[]> {
  const cards = await apiFetch<HotCardResponse[]>("/api/v1/articles/hot");
  return cards.map(toHotArticle);
}

/**
 * 팀태그 기반 관련 기사 (KAN-338). 전용 추천 API가 없어 기사의 대표 팀
 * (`teams[0]`)으로 팀 필터 목록(`GET /api/v1/articles?teamId=`)을 받아 관련
 * 기사로 쓴다. 목록에 지금 보는 기사가 섞여 올 수 있어 하나 더 받아 거른 뒤
 * `count`개로 자른다.
 *
 * 팀이 없는 기사는 BE를 부르지 않고 빈 배열을 준다 — 호출부가 빈 상태 문구를
 * 그린다. 웹 기사 세부 사이드바의 관련 기사와 모바일 "함께 보면 좋은 기사"가
 * 함께 쓴다.
 *
 * @param articleId 지금 보는 기사 id — 목록에서 걸러낸다
 * @param teams 기사의 팀 태그 (`ArticleDetail.teams`)
 * @param count 보여줄 건수
 */
export async function getRelatedArticles(
  articleId: string,
  teams: TeamCode[],
  count = 5,
): Promise<ArticleCard[]> {
  const team = teams[0];
  if (!team) return [];
  const page = await getArticles({ team, size: count + 1 });
  return page.items.filter((a) => a.id !== articleId).slice(0, count);
}
