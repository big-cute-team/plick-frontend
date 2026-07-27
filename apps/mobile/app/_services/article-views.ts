/**
 * @file 기사·릴 조회 기록 (KAN-310, `POST /api/v1/articles/{articleId}/view`).
 *
 * 릴스 전용 엔드포인트는 없다. 릴도 기사와 같은 `articleSummaryId`를 쓰므로 이
 * 하나로 두 화면을 다 처리한다(be-verify 확인).
 *
 * 보호 API다. 토큰 없이 부르면 401 `AUTH_REQUIRED`이고 익명 조회수도 안 오른다.
 * 그래서 호출부가 로그인 여부를 먼저 보고 비로그인이면 아예 부르지 않는다
 * ({@link useArticleView}).
 *
 * 좋아요(`article-likes.ts`)와 달리 서버 액션이 아니라 평범한 모듈이다. 브라우저
 * fetch는 HttpOnly 쿠키를 못 읽지만 `proxy.ts`가 `/be` 요청에 Bearer를 실어 주고
 * 만료됐으면 갱신까지 해 준다(KAN-308). 굳이 서버 액션을 경유하면 조회 기록 하나
 * 보낼 때마다 Next 서버 왕복과 라우터 갱신 페이로드가 따라붙는데, 릴을 넘길 때마다
 * 나가는 fire-and-forget 요청에는 과하다.
 */

import { apiFetch } from "@/_apis/client";

/**
 * 조회를 한 건 기록한다. 브라우저에서만 부른다.
 *
 * 하루 1회 제약은 서버가 건다 — DB에 `(user_id, article_summary_id, view_date)`
 * 유니크가 있고 겹치면 조용히 버린다(`view_date`는 KST 날짜). 그래서 같은 기사에
 * 두 번 보내도 409가 아니라 200이 오고 카운트만 안 오른다. FE가 정합성 때문에
 * 중복을 막을 필요는 없고, 낭비를 줄이려 세션 내 중복만 훅에서 걸러낸다.
 *
 * 응답 `data`는 `null`이다. 갱신된 조회수를 안 주므로 화면 카운트를 즉시 고칠 수
 * 없다 — 다음 조회 때 반영된다({@link useArticleView} 주석).
 *
 * @param articleId 기사(릴) id — BE는 int64 정수를 기대한다
 * @throws {ApiError} 비로그인·만료는 401 `AUTH_REQUIRED`·`AUTH_EXPIRED_TOKEN`,
 *   없거나 미발행인 기사는 404 `ARTICLE_NOT_FOUND`, 정수가 아닌 id는
 *   400 `COMMON_INVALID_PARAM`. 전부 호출부가 삼킨다.
 */
export async function recordArticleView(articleId: string): Promise<void> {
  await apiFetch<void>(
    `/api/v1/articles/${encodeURIComponent(articleId)}/view`,
    { method: "POST" },
  );
}
