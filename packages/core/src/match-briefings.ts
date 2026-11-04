/**
 * @file AI 경기 브리핑 읽기 fetcher (KAN-724, BE KAN-719 `GET /api/v1/matches/{matchId}/briefing`).
 *
 * 브라우저에서만 부른다. 경기 상세 페이지는 익명 ISR이라 서버 `Promise.all`에 넣지 않고 클라이언트가
 * 마운트 뒤 따로 받는다. 브리핑은 서버 저장값을 읽을 뿐이라 조회가 LLM 호출을 만들지 않는다.
 *
 * `cache: "no-store"`를 명시한다. 혹시 서버에서 불리더라도 `apiFetch`의 익명 GET 60초 데이터 캐시에
 * 들어가지 않게 하려는 것이고, `next.revalidate`와 같이 넘기면 Next가 충돌로 보고 둘 다 무시하므로
 * 하나만 쓴다. 브라우저 fetch에서는 평범한 `RequestCache` 값이다.
 */

import {
  parseMatchBriefing,
  type MatchBriefing,
} from "@plick/domain/match-briefing";
import { ApiError, apiFetch } from "./client";

/** BE 응답 `data`. READY면 `briefing`이 있고 UNAVAILABLE이면 null이다. */
export interface MatchBriefingResponse {
  status: "READY" | "UNAVAILABLE";
  briefing: unknown;
}

/**
 * 경기 하나의 브리핑. 보여 줄 게 없으면 null이다.
 *
 * null인 경우: `UNAVAILABLE`, 4xx(없는 경기 404, 아직 엔드포인트가 없는 dev의 401 포함), 모양이
 * 어긋난 payload, 경기 id가 다른 응답. 전부 "브리핑만 숨기고 기존 화면 유지"라 같은 값으로 접는다.
 * 5xx와 네트워크 실패는 던지고 훅이 `throwOnError: false`로 받아 역시 숨긴다. 4xx를 null로 접는 건
 * 다시 보내도 같은 답이라 쿼리가 에러 상태로 남을 이유가 없어서다.
 *
 * @param matchId 경기 id
 */
export async function getMatchBriefing(
  matchId: number,
): Promise<MatchBriefing | null> {
  let response: MatchBriefingResponse | null;
  try {
    response = await apiFetch<MatchBriefingResponse | null>(
      `/api/v1/matches/${matchId}/briefing`,
      { cache: "no-store" },
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500
    ) {
      return null;
    }
    throw error;
  }
  if (!response || response.status !== "READY") return null;
  return parseMatchBriefing(response.briefing, matchId);
}
