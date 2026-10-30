/**
 * @file 승부예측 쿼리키 (KAN-695). 도메인 → 스코프 → 파라미터 순 계층화는 `articleKeys.ts`와
 * 같은 규약이다. 웹·모바일이 함께 쓸 기능이라 앱 폴더를 거치지 않고 바로 여기 둔다.
 *
 * 쓰기 뒤 무효화 범위는 `prediction-sync.ts`가 정한다. 여기서는 키만 만든다.
 */

import type {
  PredictionOpinionSort,
  PredictionPick,
} from "@plick/domain/prediction";

export const predictionKeys = {
  all: ["predictions"] as const,
  /** 홈 승부예측 카드 목록. 예측 등록·취소 뒤 다시 받는다. */
  home: () => ["predictions", "home"] as const,
  /** 경기 하나의 예측 요약(상태·분포·내 예측). 진행 중 경기는 30초마다 다시 받는다. */
  summary: (matchId: number) => ["predictions", "summary", matchId] as const,
  /** 경기 하나의 의견 목록 전체 - 정렬·픽 필터를 가리지 않고 한 번에 무효화하는 상위 키. */
  opinionsOf: (matchId: number) =>
    ["predictions", "opinions", matchId] as const,
  /** 정렬·픽 필터별 의견 무한 쿼리. 픽 필터가 없으면 `ALL`. */
  opinions: (
    matchId: number,
    sort: PredictionOpinionSort,
    pick: PredictionPick | null,
  ) => ["predictions", "opinions", matchId, sort, pick ?? "ALL"] as const,
  /** 의견 하나(원 의견 전문). */
  opinion: (predictionId: number) =>
    ["predictions", "opinion", predictionId] as const,
  /** 의견 하나의 답글 목록. 답글 등록 뒤 다시 받는다. */
  replies: (predictionId: number) =>
    ["predictions", "replies", predictionId] as const,
  /** 경기 하나의 키플레이어와 VS 스탯. 투표 응답이 같은 모양이라 캐시를 바로 덮는다. */
  keyPlayers: (matchId: number) =>
    ["predictions", "key-players", matchId] as const,
  /** 시즌 랭킹. BE가 10분 캐시하므로 같은 staleTime을 둔다. */
  rankings: (scope: string) => ["predictions", "rankings", scope] as const,
  /** 내 기록 전체(적중률·예측 목록) - 예측 등록·취소 뒤 한 번에 무효화하는 상위 키. */
  mine: () => ["predictions", "me"] as const,
  /** 내 적중률·순위·예측 수. */
  myStats: () => ["predictions", "me", "stats"] as const,
  /** 내 예측 기록 무한 쿼리. */
  myList: () => ["predictions", "me", "list"] as const,
};
