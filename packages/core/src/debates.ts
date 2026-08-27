/**
 * @file 토론(투표) fetcher (KAN-418, `GET /api/v1/debates` ·
 * `GET /api/v1/articles/{articleId}/debate`).
 *
 * web·mobile이 처음부터 함께 쓰는 기능이라 앱 폴더를 거치지 않고 바로 여기
 * 둔다(ADR 0011 게이트 C). 서버 컴포넌트(첫 렌더)와 클라 훅(갱신)이 함께
 * 부르므로 서버 액션이 아니라 평범한 모듈이다 — 투표(PUT)만 보호 API라 각 앱
 * `_services/debate-actions.ts` 서버 액션으로 나가 있다.
 *
 * 둘 다 익명 허용 공개 API다. 토큰을 실으면 `myVote`가 그 유저 기준으로
 * 채워진다 — 릴스 피드의 `likedByMe`와 같은 규약(KAN-308)이다.
 */

import type { Debate, DebateListItem } from "@plick/domain/types";
import { ApiError, apiFetch } from "./client";

/**
 * BE 응답 토론 (be-verify가 스웨거·실응답으로 확인한 그대로). 리스트 아이템은
 * 여기에 `articleId`가 붙고, 릴스 카드 응답(`reels.ts`)의 `debate` 필드도 같은
 * 모양이라 export한다.
 */
export interface DebateResponse {
  debateId: number;
  topic: string;
  optionA: string;
  optionB: string;
  closesAt: string | null;
  voteCountA: number;
  voteCountB: number;
  myVote: "OPTION_A" | "OPTION_B" | null;
}

interface DebateListItemResponse extends DebateResponse {
  articleId: number;
}

/**
 * BE → 도메인 경계 변환. id를 문자열로 바꾸는 것 외에는 필드가 같지만,
 * BE 응답 모양이 화면까지 새지 않도록 다른 fetcher들과 같은 관문을 둔다.
 */
export function toDebate(d: DebateResponse): Debate {
  return {
    id: String(d.debateId),
    topic: d.topic,
    optionA: d.optionA,
    optionB: d.optionB,
    closesAt: d.closesAt,
    voteCountA: d.voteCountA,
    voteCountB: d.voteCountB,
    myVote: d.myVote,
  };
}

/**
 * 열려 있는 토론 리스트를 가져온다 (`GET /api/v1/debates`, 최신순).
 *
 * 페이지네이션·필터 파라미터가 없는 순수 배열 응답이다. 빈 상태는 `[]`.
 *
 * @param accessToken 서버에서 부를 때만 — `myVote`가 그 유저 기준으로 온다.
 *   브라우저에서는 각 앱 `proxy.ts`가 `/be` 프록시 요청에 헤더를 실어 준다.
 */
export async function getDebates({
  accessToken,
}: { accessToken?: string } = {}): Promise<DebateListItem[]> {
  const items = await apiFetch<DebateListItemResponse[]>(
    "/api/v1/debates",
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );

  return items.map((d) => ({ ...toDebate(d), articleId: String(d.articleId) }));
}

/**
 * 기사에 붙은 토론 하나를 가져온다 (`GET /api/v1/articles/{articleId}/debate`).
 *
 * 토론이 없는 기사는 404 `DEBATE_NOT_FOUND`가 정상 흐름이라 던지지 않고 null로
 * 돌려준다 — 기사 상세가 "투표형 게시물인가"를 이 호출로 판별하기 때문이다.
 *
 * @param articleId 기사 id (`articleSummaryId`)
 * @param accessToken 서버에서 부를 때만 — {@link getDebates}와 같은 규약
 * @throws {ApiError} 404 `DEBATE_NOT_FOUND` 외의 실패(잘못된 id 400 등)는 그대로 던진다
 */
export async function getArticleDebate(
  articleId: string,
  { accessToken }: { accessToken?: string } = {},
): Promise<Debate | null> {
  try {
    const debate = await apiFetch<DebateResponse>(
      `/api/v1/articles/${articleId}/debate`,
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    );
    return toDebate(debate);
  } catch (error) {
    if (error instanceof ApiError && error.code === "DEBATE_NOT_FOUND") {
      return null;
    }
    throw error;
  }
}
