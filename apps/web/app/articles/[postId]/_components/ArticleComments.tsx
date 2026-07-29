"use client";

import { useState } from "react";
import type { InitialCommentPage } from "@plick/domain/types";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentList } from "@/_components/CommentList";
import { CommentsHeader } from "@/_components/CommentsHeader";

/**
 * 기사 세부의 댓글 섹션 (KAN-329) — 헤더 카운트·입력바·목록을 묶는 클라 경계.
 * 모바일 `ArticleComments`와 같은 구성이다.
 *
 * 서버 컴포넌트(`ArticleMain`)에서 이 덩어리만 클라로 내려온다. 카운트를 여기서
 * 들고 있는 이유: 원본(`article.commentCount`)은 서버가 렌더 때 받은 스냅샷이라
 * 방금 단 댓글이 반영되지 않는다. 등록 성공(원 댓글·답글)마다 로컬로 하나씩
 * 올리고, 삭제 성공마다 하나씩 내린다(BE 집계가 삭제를 빼고 센다, KAN-333).
 * 답글 입력바는 각 스레드가 인라인으로 연다.
 *
 * @param articleId 기사 id
 * @param initialCount 서버가 받은 댓글 수 (대댓글 포함, 삭제 제외)
 * @param initialComments 서버가 미리 받아 둔 첫 페이지. 서버 fetch가 실패했으면
 *   없이 들어오고, 그때는 목록이 클라에서 직접 받는다.
 */
export function ArticleComments({
  articleId,
  initialCount,
  initialComments,
}: {
  articleId: string;
  initialCount: number;
  initialComments?: InitialCommentPage;
}) {
  const [added, setAdded] = useState(0);
  const bump = () => setAdded((n) => n + 1);
  const drop = () => setAdded((n) => n - 1);

  return (
    <>
      <CommentsHeader count={initialCount + added} className="mt-4" />
      <CommentComposer
        articleId={articleId}
        onPosted={bump}
        className="mt-3 mb-4"
      />
      <CommentList
        articleId={articleId}
        initial={initialComments}
        onPosted={bump}
        onDeleted={drop}
      />
    </>
  );
}
