/**
 * @file 마이페이지 활동 조회 fetcher (KAN-495 모바일 → KAN-567 웹 이식,
 * `GET /api/v1/users/me/likes`, `/users/me/comments`, `/users/me/activity`).
 *
 * 서버 컴포넌트(마이페이지의 첫 페이지와 개수)와 클라 훅(다음 페이지, 새로고침)
 * 양쪽에서 부르므로 서버 액션이 아니라 평범한 모듈이다. base URL 선택은
 * `apiFetch`가 실행 위치를 보고 알아서 한다.
 *
 * 셋 다 로그인 필수(토큰 없으면 401 `AUTH_REQUIRED`)라 토큰은 늘 실린다. 서버에서
 * 부를 때는 호출부가 `getAccessToken()`으로 꺼내 넘기고, 브라우저에서는 HttpOnly
 * 쿠키를 못 읽으니 `proxy.ts`가 `/be` 요청에 Bearer를 심어 준다(댓글 조회와 같은
 * 방식, ADR 0044). 토큰을 실은 서버 호출은 `apiFetch`가 no-store로 보내 유저별
 * 데이터가 공유 캐시에 남지 않는다.
 *
 * 모바일 `_services/activity.ts`의 복제다. 두 번째 사용처가 생겼으니 다음 정리 때
 * `@plick/core`로 승격할 후보다(ADR 0011 게이트 C).
 */

import { toArticleCard, type FeedCardResponse } from "@plick/core/articles";
import { apiFetch } from "@plick/core/client";
import type { ArticleFeedPage } from "@plick/domain/types";
import { ACTIVITY_PAGE_SIZE } from "@/_constants/me";
import type {
  MyActivityCounts,
  MyComment,
  MyCommentPage,
} from "@/_types/activity";

/** 커서 페이지 요청 공통 인자. */
interface PageQuery {
  /** 이전 페이지가 준 `nextCursor`. 첫 페이지면 null. */
  cursor?: string | null;
  /** 한 페이지 건수 (1..30). 범위 밖은 400. */
  size?: number;
  /** 서버에서 부를 때만 넘긴다. 브라우저 호출은 `proxy.ts`가 대신 실어 준다. */
  accessToken?: string;
}

/** 커서, 건수를 쿼리스트링으로 만든다. 세 fetcher가 같은 모양이다. */
function pageRequest({ cursor, size = ACTIVITY_PAGE_SIZE }: PageQuery) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  return params;
}

function authHeaders(accessToken?: string): RequestInit | undefined {
  return accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : undefined;
}

/** BE 응답 (be-verify가 소스로 확인한 계약). 카드는 홈 피드와 같은 레코드다. */
interface LikedArticlesResponse {
  items: FeedCardResponse[];
  nextCursor: string | null;
}

/**
 * 내가 좋아요한 기사 한 페이지. 좋아요 누른 시각 최신순이고 발행 상태가 아닌
 * 기사는 BE가 SQL에서 걸러 페이지가 짧아지지 않는다. 카드의 `likedByMe`는 항상
 * true다.
 *
 * 커서는 홈 피드와 형식이 같지만 정렬 축이 달라 섞어 쓸 수 없다. 이 API가 준
 * 값만 되돌려준다.
 *
 * @throws {ApiError} 잘못된 건수, 커서는 400 `COMMON_INVALID_PARAM`, 토큰이
 *   없거나 만료면 401 `AUTH_REQUIRED`
 */
export async function getLikedArticles(
  query: PageQuery = {},
): Promise<ArticleFeedPage> {
  const page = await apiFetch<LikedArticlesResponse>(
    `/api/v1/users/me/likes?${pageRequest(query)}`,
    authHeaders(query.accessToken),
  );
  return {
    items: page.items.map(toArticleCard),
    nextCursor: page.nextCursor,
  };
}

/** BE 응답 댓글 한 건 (be-verify가 소스로 확인한 계약). */
interface MyCommentResponse {
  commentId: number;
  content: string;
  createdAt: string;
  isEdited: boolean;
  isBlinded: boolean;
  likeCount: number;
  article: {
    articleSummaryId: number;
    title: string;
    imageUrl: string | null;
  };
}

interface MyCommentsResponse {
  items: MyCommentResponse[];
  nextCursor: string | null;
}

/** BE → 화면 경계 변환. 기사 id를 라우트 파라미터와 같은 문자열로 맞춘다. */
function toMyComment(r: MyCommentResponse): MyComment {
  return {
    id: r.commentId,
    content: r.content,
    createdAt: r.createdAt,
    isEdited: r.isEdited,
    isBlinded: r.isBlinded,
    likeCount: r.likeCount,
    article: {
      id: String(r.article.articleSummaryId),
      title: r.article.title,
      imageUrl: r.article.imageUrl,
    },
  };
}

/**
 * 내가 쓴 댓글 한 페이지. 작성 시각 최신순이고 삭제한 댓글과 발행 상태가 아닌
 * 기사의 댓글은 빠진다. 블라인드 댓글은 원문 그대로 오고 `isBlinded`로 알린다.
 *
 * @throws {ApiError} 에러 규약은 {@link getLikedArticles}와 같다
 */
export async function getMyComments(
  query: PageQuery = {},
): Promise<MyCommentPage> {
  const page = await apiFetch<MyCommentsResponse>(
    `/api/v1/users/me/comments?${pageRequest(query)}`,
    authHeaders(query.accessToken),
  );
  return {
    items: page.items.map(toMyComment),
    nextCursor: page.nextCursor,
  };
}

/**
 * 활동 개수. 두 목록과 같은 필터(미발행 기사, 삭제 댓글 제외, 블라인드 포함)로
 * 센 값이라 목록 건수와 어긋나지 않는다. 응답 필드가 화면 타입과 같아 변환이 없다.
 *
 * @param accessToken 서버에서 부를 때만 넘긴다
 * @throws {ApiError} 토큰이 없거나 만료면 401 `AUTH_REQUIRED`
 */
export async function getMyActivityCounts(
  accessToken?: string,
): Promise<MyActivityCounts> {
  return apiFetch<MyActivityCounts>(
    "/api/v1/users/me/activity",
    authHeaders(accessToken),
  );
}
