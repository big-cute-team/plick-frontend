/**
 * @file 좋아요 공용 타입 (KAN-308 기사·릴, KAN-309 댓글).
 *
 * 기사와 댓글은 엔드포인트가 다르지만 계약이 같다 — 등록·취소 모두 멱등이고
 * 응답은 최신 카운트 하나이며 실패 규약도 같다. 그래서 도메인별로 나누지 않고
 * 한 자리에 둔다. 처음에는 `_types/articles.ts`에 있었는데 댓글이 두 번째
 * 사용처가 되면서 옮겼다.
 */

/** 좋아요 한 건의 표시 상태. 낙관적 갱신도 롤백도 이 덩어리를 통째로 바꾼다. */
export interface LikeState {
  liked: boolean;
  likeCount: number;
}

/**
 * 좋아요 등록·취소 서버 액션의 결과.
 *
 * 서버 액션은 던진 에러의 메시지를 프로덕션에서 가려 버리므로(`ApiError`
 * 인스턴스도 경계를 못 넘는다) 값으로 돌려주고, 클라 훅이 다시 `ApiError`로
 * 되살린다. 댓글 작성(`CreateCommentResult`)과 같은 규약이다.
 *
 * 성공이면 BE가 계산한 최신 좋아요 수가 온다 — 낙관적으로 ±1 한 값을 이걸로
 * 덮어 다른 사람이 그 사이 누른 것까지 반영한다.
 */
export type ToggleLikeResult =
  | { ok: true; likeCount: number }
  | { ok: false; status: number; code: string; message: string };
