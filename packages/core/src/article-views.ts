/**
 * @file 기사·릴 조회 기록 (KAN-310, `POST /api/v1/articles/{articleId}/view`).
 *
 * 릴스 전용 엔드포인트는 없다. 릴도 기사와 같은 `articleSummaryId`를 쓰므로 이
 * 하나로 두 화면을 다 처리한다(be-verify 확인).
 *
 * KAN-543부터 비로그인도 부른다(BE KAN-538). 토큰이 있으면(게스트 포함) 지금처럼
 * 기록과 조회수를 남기고, 없으면 기록 없이 분석 이벤트(`article_opened`)만 남긴다.
 * 응답은 둘 다 200이다. 그래서 호출부(각 앱 `useArticleView`)가 로그인 여부를 보지 않는다.
 *
 * 좋아요(각 앱 `article-likes.ts`)와 달리 서버 액션이 아니라 평범한 모듈이다.
 * 브라우저 fetch는 HttpOnly 쿠키를 못 읽지만 각 앱 `proxy.ts`가 `/be` 요청에
 * Bearer를 실어 주고 만료됐으면 갱신까지 해 준다(KAN-308). 굳이 서버 액션을
 * 경유하면 조회 기록 하나 보낼 때마다 Next 서버 왕복과 라우터 갱신 페이로드가
 * 따라붙는데, 릴을 넘길 때마다 나가는 fire-and-forget 요청에는 과하다.
 */

import { apiFetch } from "./client";

/**
 * 피드에서 누른 기사의 순위를 기사 화면이 마운트될 때까지 들고 있는 자리 (KAN-543).
 *
 * 순위는 목록(피드, 핫이슈)이 알고 조회 기록은 기사 화면이 보내는데, 둘 사이에 라우트
 * 전환이 있어 prop으로 못 잇는다. URL 쿼리에 실으면 공유·색인 주소가 더러워진다. 그래서
 * 링크를 누를 때 여기 적어 두고(`rememberFeedRank`) 기사 화면이 꺼내 쓴다(`takeFeedRank`).
 *
 * 수명을 둔다. cmd+클릭으로 새 탭에 열면 이 탭에는 기사 화면이 안 뜨고 값만 남는데,
 * 한참 뒤 관련 기사로 같은 글을 열었을 때 그 옛 순위가 붙으면 안 된다.
 */
const feedRanks = new Map<string, { rank: number; at: number }>();

/** 기억한 순위가 유효한 시간(ms). 링크 클릭에서 기사 화면 마운트까지의 여유다. */
const FEED_RANK_TTL_MS = 10_000;

/**
 * 피드에서 이 기사를 눌렀다. 순위(0부터)를 기억해 둔다.
 *
 * @param articleId 누른 기사 id
 * @param rank 목록 안 순위. 0부터
 */
export function rememberFeedRank(articleId: string, rank: number): void {
  feedRanks.set(articleId, { rank, at: Date.now() });
}

/**
 * 기억해 둔 순위를 꺼내고 지운다. 없거나 오래됐으면 undefined.
 *
 * @param articleId 기사 화면이 보여주는 기사 id
 */
export function takeFeedRank(articleId: string): number | undefined {
  const entry = feedRanks.get(articleId);
  if (!entry) return undefined;
  feedRanks.delete(articleId);
  return Date.now() - entry.at <= FEED_RANK_TTL_MS ? entry.rank : undefined;
}

/**
 * 조회를 한 건 기록한다. 브라우저에서만 부른다.
 *
 * 하루 1회 제약은 서버가 건다 — DB에 `(user_id, article_summary_id, view_date)`
 * 유니크가 있고 겹치면 조용히 버린다(`view_date`는 KST 날짜). 그래서 같은 기사에
 * 두 번 보내도 409가 아니라 200이 오고 카운트만 안 오른다. 분석 이벤트
 * (`article_opened`)는 호출마다 남으므로 FE가 중복을 걸러서는 안 된다(KAN-543) —
 * 같은 기사를 다시 열면 다시 부른다.
 *
 * 응답 `data`는 `null`이다. 갱신된 조회수를 안 주므로 화면 카운트를 즉시 고칠 수
 * 없다 — 다음 조회 때 반영된다(각 앱 `useArticleView` 주석).
 *
 * @param articleId 기사(릴) id — BE는 int64 정수를 기대한다
 * @param rank 피드에서 연 기사면 그 순위(0부터). 서버가 `feed_rank`로 남긴다. 모르면 생략
 * @throws {ApiError} 만료·형식 불량 토큰은 401 `AUTH_EXPIRED_TOKEN`·
 *   `AUTH_INVALID_TOKEN`, 없거나 미발행인 기사는 404 `ARTICLE_NOT_FOUND`, 정수가
 *   아닌 id·rank는 400 `COMMON_INVALID_PARAM`, 비로그인 IP 한도(분당 120회)는
 *   429 `COMMON_RATE_LIMITED`. 전부 호출부가 삼킨다. 403이 보이면 앱 에러가
 *   아니라 BE CorsFilter 거절이다 — 브라우저 POST에 실린 Origin이 BE
 *   `CORS_ALLOWED_ORIGINS`에 없는 경우로, body가 봉투 아닌 plain text
 *   (`Invalid CORS request`)라 code가 `"403"`으로 폴백된다. 로컬에서 웹(:3000)만
 *   나면 BE `.env`의 허용 목록부터 본다.
 */
export async function recordArticleView(
  articleId: string,
  rank?: number,
): Promise<void> {
  const query =
    rank !== undefined && Number.isInteger(rank) && rank >= 0
      ? `?rank=${rank}`
      : "";
  await apiFetch<void>(
    `/api/v1/articles/${encodeURIComponent(articleId)}/view${query}`,
    { method: "POST" },
  );
}
