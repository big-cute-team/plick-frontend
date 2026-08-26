/**
 * @file 릴스 피드 fetcher (KAN-276, `GET /api/v1/reels`).
 *
 * 모바일 `_services/reels.ts`로 살다 web이 두 번째 사용처가 되면서 승격했다
 * (KAN-323, ADR 0011 게이트 C). 기사 피드(`articles.ts`)와 같은 자리다.
 *
 * 서버 컴포넌트(첫 페이지)와 클라 훅(다음 페이지)이 함께 부른다. 그래서 서버
 * 액션(`"use server"`)이 아니라 평범한 모듈이고, base URL 선택은 `apiFetch`가
 * 실행 위치를 보고 알아서 한다.
 *
 * 익명 허용 공개 API다. 스웨거에는 전역 `bearerAuth`가 걸려 있어 인증이 필요한 것처럼
 * 보이지만 토큰 없이 200이 온다. 처음 붙일 때는 토큰을 아예 싣지 않았는데(ADR 0030),
 * 좋아요를 붙이면서 있으면 싣는 쪽으로 바꿨다 — BE가 참여 정보를 실제로 채우기
 * 시작해서 `likedByMe`가 토큰이 있을 때만 그 유저 기준으로 온다(KAN-308).
 * 만료 토큰으로 401을 맞을 걱정은 없다 — access 쿠키 수명이 곧 토큰 수명이라
 * 만료되면 쿠키가 사라져 토큰 없이 부르게 된다.
 */

import { STAGE_BY_BE_VALUE, TEAM_CODES } from "@plick/domain/constants";
import type { ReelCard, ReelFeedPage, TeamCode } from "@plick/domain/types";
import { apiFetch } from "./client";

/** BE 응답 카드 (이 파일 로컬 — be-verify가 실제 응답으로 확인한 그대로). */
interface ReelsCardResponse {
  articleSummaryId: number;
  title: string;
  summary: string;
  rumorStage: string | null;
  publishedAt: string;
  /** 릴 배경 이미지. 기사 피드는 같은 자리를 `mainImageUrl`로 부른다. */
  reelsImageUrl: string | null;
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

interface ReelsFeedResponse {
  items: ReelsCardResponse[];
  nextCursor: string | null;
}

/** BE가 한 번에 내려주는 최대 건수. 이보다 크면 400이다. */
export const REELS_MAX_PAGE_SIZE = 30;

/**
 * 릴스 한 페이지 크기.
 *
 * 릴 하나가 화면을 꽉 채워 한 번에 한 장씩만 보므로 기사 리스트처럼 많이 받을 이유가
 * 없다. 다음 페이지는 끝에 가까워질 때 미리 당긴다.
 */
export const REELS_PAGE_SIZE = 10;

/**
 * BE → 도메인 경계 변환. 필드명·철자·null 차이를 전부 여기서 흡수한다.
 * 화면은 `ReelCard`만 보고 BE 응답 모양을 모른다.
 */
function toReelCard(r: ReelsCardResponse): ReelCard {
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
    imageUrl: r.reelsImageUrl ?? r.detailImageUrl,
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
 * 릴스 피드 한 페이지를 가져온다.
 *
 * @param cursor 이전 페이지가 준 `nextCursor`. 첫 페이지면 null.
 * @param size 한 페이지 건수 (1..30)
 * @param accessToken 서버에서 부를 때만 넘긴다 — 응답의 `likedByMe`가 그 유저
 *   기준으로 계산된다(KAN-308). 브라우저에서 부를 때는 쿠키를 못 읽으므로
 *   비우고, 대신 각 앱 `proxy.ts`가 `/be` 프록시 요청에 같은 헤더를 실어 준다.
 * @throws {ApiError} 잘못된 파라미터·커서는 400 `COMMON_INVALID_PARAM`으로 온다
 */
export async function getReels({
  cursor = null,
  size = REELS_PAGE_SIZE,
  accessToken,
}: {
  cursor?: string | null;
  size?: number;
  accessToken?: string;
} = {}): Promise<ReelFeedPage> {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<ReelsFeedResponse>(
    `/api/v1/reels?${params}`,
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );

  return {
    items: page.items.map(toReelCard),
    nextCursor: page.nextCursor,
  };
}

/**
 * 특정 릴에서 시작하는 피드 한 페이지 (KAN-349, `GET /api/v1/reels/{postId}`).
 *
 * 공유 링크(`/reels/[postId]`) 진입용이다. `items[0]`이 그 릴이고 이후가 원문 발행
 * 시각 최신순의 다음 릴들이다 — 순서는 로그인 여부와 무관하게 전역 동일하고,
 * `likedByMe`만 토큰 기준으로 채워진다. 이어보기는 응답의 `nextCursor`를 그대로
 * {@link getReels}에 넘긴다. 딥링크 엔드포인트가 아니라 기존 피드로 이어 간다.
 *
 * @param postId 앵커 릴 id (`articleSummaryId`)
 * @param size 한 페이지 건수 (1..30) — 피드와 같은 상한이다
 * @param accessToken 서버에서 부를 때만 — {@link getReels}와 같은 규약
 * @throws {ApiError} 없는·미발행 릴은 404 `ARTICLE_NOT_FOUND`,
 *   정수가 아닌 id는 400 `COMMON_INVALID_PARAM`으로 온다
 */
export async function getReelsFrom(
  postId: string,
  {
    size = REELS_PAGE_SIZE,
    accessToken,
  }: { size?: number; accessToken?: string } = {},
): Promise<ReelFeedPage> {
  const page = await apiFetch<ReelsFeedResponse>(
    `/api/v1/reels/${postId}?${new URLSearchParams({ size: String(size) })}`,
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );

  return {
    items: page.items.map(toReelCard),
    nextCursor: page.nextCursor,
  };
}
