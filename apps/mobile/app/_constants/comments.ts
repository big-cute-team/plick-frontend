/**
 * @file 댓글 상수 (KAN-303).
 */

/**
 * 댓글 본문 최대 글자수. BE 검증(1~500자)과 같은 값이다 — 클라에서 미리 걸어
 * 400 `COMMON_INVALID_PARAM` 왕복을 줄이고, BE가 최종 검증한다.
 */
export const COMMENT_MAX_LENGTH = 500;

/**
 * 댓글 한 페이지 건수 (BE 기본값과 같다, 상한 30). 첫 화면에 이만큼 보여주고
 * 나머지는 "댓글 더 보기"로 이어 받는다.
 */
export const COMMENTS_PAGE_SIZE = 10;
