/**
 * @file 기사 핫이슈·상세 fetcher (KAN-282 `GET /api/v1/articles/hot`,
 * KAN-283 `GET /api/v1/articles/{id}`).
 *
 * 피드 fetcher(`getArticles`)도 여기 살았는데 web이 두 번째 사용처가 되면서
 * `@plick/core/articles`로 승격했다(KAN-321). 핫이슈·상세는 아직 모바일만
 * 쓰므로 남아 있고, web이 붙는 티켓에서 따라 올라간다.
 *
 * 익명 허용 공개 API다. 스웨거에는 전역 `bearerAuth`가 걸려 있어 인증이 필요한
 * 것처럼 보이지만 실제로는 토큰 없이 200이 온다. 오히려 만료된 토큰을 실으면
 * 401로 피드 전체가 죽으므로 핫이슈는 일부러 토큰을 싣지 않는다.
 */

import { STAGE_BY_BE_VALUE, TEAM_CODES } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { apiFetch } from "@plick/core/client";
import { TEAM_BY_KO_NAME } from "@/_constants/api";
import type { ArticleDetail, HotArticle } from "@/_types/articles";

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
 * 만료 토큰으로 401을 맞을 걱정은 없다({@link getAccessToken} 참고).
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
