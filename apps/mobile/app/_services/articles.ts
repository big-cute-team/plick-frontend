/**
 * @file 기사 핫이슈 fetcher (KAN-282 `GET /api/v1/articles/hot`).
 *
 * 피드 fetcher(`getArticles`)와 상세 fetcher(`getArticle`)도 여기 살았는데
 * web이 두 번째 사용처가 되면서 각각 KAN-321, KAN-322에 `@plick/core/articles`로
 * 승격했다. 핫이슈는 아직 모바일만 쓰므로 남아 있고, web이 붙는 티켓에서 따라
 * 올라간다.
 *
 * 익명 허용 공개 API다. 스웨거에는 전역 `bearerAuth`가 걸려 있어 인증이 필요한
 * 것처럼 보이지만 실제로는 토큰 없이 200이 온다. 오히려 만료된 토큰을 실으면
 * 401로 피드 전체가 죽으므로 핫이슈는 일부러 토큰을 싣지 않는다.
 */

import { STAGE_BY_BE_VALUE, TEAM_CODES } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { apiFetch } from "@plick/core/client";
import type { HotArticle } from "@/_types/articles";

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
