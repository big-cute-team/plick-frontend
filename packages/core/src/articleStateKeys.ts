/**
 * @file 내 기사 상태(좋아요·투표 여부) 쿼리키 (KAN-664).
 *
 * 묶음이 아니라 기사 하나에 키 하나를 둔다. 릴스 피드가 페이지를 더 받으면 새 카드의 id만
 * 캐시에 없어서 그것만 묻게 되고, 같은 기사가 피드와 상세에 함께 떠도 한 값을 나눠 본다.
 * 여러 키의 요청은 `article-states.ts`의 로더가 한 번의 호출로 묶는다.
 */

export const articleStateKeys = {
  all: ["article-states"] as const,
  byId: (articleId: string) => ["article-states", articleId] as const,
};
