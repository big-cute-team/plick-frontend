"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentListSkeleton } from "@/_components/CommentList";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { QueryBoundary } from "@/_components/QueryBoundary";

/**
 * 댓글 목록은 브라우저에서만 그린다 (KAN-664). 페이지가 익명 ISR이 되면서 서버 씨앗이 없어졌는데,
 * 그대로 두면 suspense 쿼리가 서버 렌더(ISR 생성) 중에 토큰 없이 댓글을 받아 HTML에 굳힌다.
 * 댓글은 내 좋아요와 차단 가림이 섞인 사람마다 다른 응답이라 캐시된 HTML에 들어가면 안 되고,
 * 브라우저 캐시에는 그 데이터가 없어 하이드레이션에서 다시 받으며 어긋난다. 서버와 하이드레이션은
 * 뼈대로 그리고 마운트 뒤 목록이 받는다.
 */
const CommentList = dynamic(
  () => import("@/_components/CommentList").then((m) => m.CommentList),
  { ssr: false, loading: () => <CommentListSkeleton /> },
);

/**
 * 기사 세부의 댓글 섹션 (KAN-303) — 헤더 카운트·입력바·목록을 묶는 클라 경계.
 *
 * 서버 컴포넌트(`ArticleBody`)에서 이 덩어리만 클라로 내려온다. 카운트를 여기서
 * 들고 있는 이유: 원본(`article.commentCount`)은 서버가 렌더 때 받은 스냅샷이라
 * 방금 단 댓글이 반영되지 않는다. 등록 성공(원 댓글·답글)마다 로컬로 하나씩
 * 올리고, 삭제 성공마다 하나씩 내린다(BE 집계가 삭제를 빼고 센다, KAN-333).
 * 답글 입력바는 각 스레드가 유튜브처럼 인라인으로 연다.
 *
 * @param articleId 기사 id
 * @param initialCount 서버가 받은 댓글 수 (대댓글 포함, 삭제 제외)
 */
export function ArticleComments({
  articleId,
  initialCount,
}: {
  articleId: string;
  initialCount: number;
}) {
  const [added, setAdded] = useState(0);
  const bump = () => setAdded((n) => n + 1);
  const drop = () => setAdded((n) => n - 1);

  return (
    <>
      <CommentsHeader count={initialCount + added} />
      <CommentComposer articleId={articleId} onPosted={bump} />
      {/* 댓글만의 실패는 이 경계가 받는다 (KAN-447) — 기사 본문은 살아남는다 */}
      <QueryBoundary
        name="ArticleComments"
        fallback={<CommentListSkeleton />}
        errorMessage="댓글을 불러오지 못했어요."
      >
        <CommentList articleId={articleId} onPosted={bump} onDeleted={drop} />
      </QueryBoundary>
    </>
  );
}
