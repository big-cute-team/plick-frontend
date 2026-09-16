/**
 * @file 실시간 급상승 랭킹 fetcher (KAN-501, `GET /api/v1/trends`).
 *
 * 10분마다 도는 배치가 회차별로 미리 계산해 둔 순위를 그대로 읽어 온다
 * (KAN-496) — 화면에서 점수를 계산하거나 정렬을 다시 세우는 일이 없다.
 *
 * 익명 허용 공개 API다. 로그인해도 응답이 같아 토큰을 싣지 않는다 — 만료 토큰을
 * 실으면 오히려 401이다(인물·팀 프로필과 같은 판단). 단발 읽기라 서버
 * 컴포넌트에서 await 한다.
 */

import type { TrendItem, TrendRanking, TrendType } from "@plick/domain/types";
import { apiFetch } from "./client";

/**
 * 한 탭에 세우는 랭킹 길이. 팀은 마스터가 6개라 전부고, 선수는 상위 6명이다
 * (KAN-496). BE 기본값과 같지만 명시해 보내 화면이 정한 수임을 남긴다.
 */
export const TRENDS_COUNT = 6;

/** BE가 이 범위 밖 `limit`을 400으로 되돌린다. 화면이 넘길 일은 없지만 계약을 남긴다. */
const LIMIT_MIN = 1;
const LIMIT_MAX = 20;

/** BE 응답 원소 (be-verify 없이 dev 실응답으로 확인한 그대로). */
interface TrendItemResponse {
  entityId: number;
  name: string;
  imageUrl: string | null;
  /** 내부 지수 점수. 화면이 쓰지 않아 도메인 타입에는 없다. */
  score: number;
  rank: number;
  previousRank: number | null;
  rankDelta: number | null;
  direction: string;
  scoreChangeRate: number | null;
}

interface TrendRankingResponse {
  type: string;
  collectedAt: string | null;
  items: TrendItemResponse[];
}

const DIRECTIONS = ["UP", "DOWN", "SAME", "NEW"] as const;

/** 모르는 값이 와도 화살표 자리만 비게 SAME으로 떨어뜨린다. */
function toDirection(raw: string): TrendItem["direction"] {
  return DIRECTIONS.includes(raw as TrendItem["direction"])
    ? (raw as TrendItem["direction"])
    : "SAME";
}

/**
 * 급상승 랭킹 한 벌.
 *
 * 배치가 아직 회차를 만들지 않았으면 `items`가 빈 배열이고 `collectedAt`이
 * null이다(로컬 BE 실측). 에러가 아니라 정상 응답이라 호출부는 빈 상태를 그린다.
 *
 * @param type TEAM이면 구단, PLAYER면 선수 랭킹
 * @param limit 받을 건수. 1 미만이거나 20 초과면 BE가 400 `COMMON_INVALID_PARAM`.
 * @throws {ApiError} 위 범위를 벗어난 `limit`과 서버 오류.
 */
export async function getTrends(
  type: TrendType,
  limit: number = TRENDS_COUNT,
): Promise<TrendRanking> {
  const size = Math.min(Math.max(limit, LIMIT_MIN), LIMIT_MAX);
  const params = new URLSearchParams({ type, limit: String(size) });

  const ranking = await apiFetch<TrendRankingResponse>(
    `/api/v1/trends?${params}`,
  );

  return {
    type,
    collectedAt: ranking.collectedAt,
    items: ranking.items.map((item) => ({
      entityId: item.entityId,
      name: item.name,
      imageUrl: item.imageUrl,
      rank: item.rank,
      direction: toDirection(item.direction),
      rankDelta: item.rankDelta,
      scoreChangeRate: item.scoreChangeRate,
    })),
  };
}
