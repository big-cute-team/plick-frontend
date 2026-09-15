/**
 * @file 마이페이지 활동 쿼리키 (KAN-495). 도메인 → 스코프 순으로 계층화해서
 * 상위 키로 하위를 한 번에 무효화할 수 있게 둔다.
 *
 * 첫 사용처가 모바일뿐인데도 `@plick/core`에 두는 이유는 `like-sync.ts`가 이
 * 키를 알아야 해서다. 기사 세부·릴스에서 좋아요를 끄면 캐시된 "좋아요한 기사"
 * 목록의 그 카드도 함께 고쳐야 하는데, 그 동작은 이미 core에 있는
 * `syncLikeIntoFeeds`가 맡는다. 앱 레이어에 두면 core가 앱을 역참조하게 된다
 * (ADR 0011 게이트 A).
 */

export const activityKeys = {
  all: ["activity"] as const,
  /** 내가 좋아요한 기사 목록. 좋아요 누른 순 커서 페이지. */
  likes: () => ["activity", "likes"] as const,
  /** 내가 쓴 댓글 목록. 작성 순 커서 페이지. */
  comments: () => ["activity", "comments"] as const,
  /** 활동 개수(좋아요 수·댓글 수). 상단 숫자와 탭 라벨. */
  counts: () => ["activity", "counts"] as const,
};
