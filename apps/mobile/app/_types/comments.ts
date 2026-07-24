/**
 * @file 댓글 도메인 타입 (KAN-303, `GET·POST /api/v1/articles/{articleId}/comments`).
 *
 * `@plick/domain`의 `Comment`는 퍼블리싱 단계에서 BE 목표 shape를 추정해 만든
 * 타입이고 실제 계약과 어긋난다 — 작성자가 핸들이 아니라 닉네임이고, 시각이
 * 표시 문자열이 아니라 ISO이며, 삭제 tombstone과 수정 여부 플래그가 있다.
 * 그래서 기사 타입(KAN-271)과 같은 판단으로 실제 계약을 그대로 담는 타입을
 * 앱 로컬에 둔다. web이 같은 API를 붙이면 `@plick/domain` 승격을 ADR 0011
 * 게이트로 판단한다.
 */

/**
 * 댓글 한 건 (+대댓글). 릴스와 기사 세부가 같은 댓글을 본다 — BE comments가
 * `article_summary_id`에 걸려 있어 릴 카드 id로도 같은 목록이 온다.
 */
export interface ArticleComment {
  /** BE `commentId`. 라우트에 안 쓰여 숫자 그대로 둔다. */
  id: number;
  /** 작성자 표시명. BE가 닉네임 하나만 준다(아바타·핸들 없음). 삭제돼도 유지된다. */
  nickname: string;
  /** 본문. 삭제된 댓글(tombstone)이면 null — `isDeleted`와 짝으로 분기한다. */
  content: string | null;
  /** 작성 시각 ISO-8601 (KST 오프셋 포함). 화면은 상대 시각으로 바꿔 그린다. */
  createdAt: string;
  isEdited: boolean;
  /**
   * 삭제 여부. 삭제돼도 목록에서 사라지지 않고 tombstone으로 남는다 —
   * 대댓글이 딸린 원 댓글을 지워도 답글은 계속 보여야 하기 때문.
   * 단 `commentCount` 집계에서는 빠져서 헤더 숫자와 목록 행수가 다를 수 있다.
   */
  isDeleted: boolean;
  likeCount: number;
  /** 내가 좋아요를 눌렀는지. 토큰을 안 실은 조회에서는 항상 false다. */
  liked: boolean;
  /** 대댓글 — 부모에 통째로 인라인(오래된순). 커서 페이지 계산에서 빠진다. */
  replies: ArticleComment[];
}

/**
 * 커서 페이지네이션 한 페이지. 기사 피드(`ArticleFeedPage`)와 같은 규약이다 —
 * 총 건수도 `hasNext`도 없고 `nextCursor`가 null인지로만 끝을 판단한다.
 */
export interface CommentPage {
  items: ArticleComment[];
  /** 서버 발급 opaque 커서. null이면 마지막 페이지. 파싱하지 말고 되돌려준다. */
  nextCursor: string | null;
}

/**
 * 서버 컴포넌트가 미리 받아 클라 캐시에 심을 첫 페이지.
 * 시각을 같이 묶는 이유는 `InitialArticleFeed`와 같다 — 신선도 기준점 없이
 * 데이터만 넘기면 묵은 씨앗이 방금 받은 것으로 취급된다.
 */
export interface InitialCommentPage {
  page: CommentPage;
  /** 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점. */
  fetchedAt: number;
}

/**
 * 댓글 작성 서버 액션의 결과. 서버 액션은 던진 에러의 메시지를 프로덕션에서
 * 가려 버리므로(`ApiError` 인스턴스도 경계를 못 넘는다) 값으로 돌려주고,
 * 클라 훅이 다시 `ApiError`로 되살린다.
 */
export type CreateCommentResult =
  | { ok: true; comment: ArticleComment }
  | { ok: false; status: number; code: string; message: string };
