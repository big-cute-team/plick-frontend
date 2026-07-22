/**
 * @file 릴스 쿼리키 (KAN-276). 도메인 → 스코프 순으로 계층화해서 상위 키로
 * 하위를 한 번에 무효화할 수 있게 둔다.
 */

export const reelKeys = {
  all: ["reels"] as const,
  /**
   * 릴스 피드. 파라미터가 붙지 않는다 — BE에 팀 필터도 정렬 옵션도 없고
   * 모두가 같은 최신순 목록 하나를 본다.
   */
  feed: () => ["reels", "feed"] as const,
};
