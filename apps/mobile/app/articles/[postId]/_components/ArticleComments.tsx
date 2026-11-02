"use client";

import dynamic from "next/dynamic";
import type { Debate } from "@plick/domain/types";
import { DebateParticipationGate } from "@/_components/DebateParticipationGate";
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
 * 댓글 수는 `CommentsHeader`의 기사별 캐시에서 읽는다. 투표 의견 창과 일반 댓글·답글의
 * 작성·삭제 훅이 이 값을 함께 갱신한다(KAN-705).
 *
 * @param articleId 기사 id
 * @param initialCount 서버가 받은 댓글 수 (대댓글 포함, 삭제 제외)
 */
export function ArticleComments({
  articleId,
  initialCount,
  debate,
  closed,
}: {
  articleId: string;
  initialCount: number;
  debate?: Debate | null;
  closed?: boolean;
}) {
  return (
    <>
      <CommentsHeader articleId={articleId} count={initialCount} />
      <DebateParticipationGate
        articleId={articleId}
        debate={debate}
        closed={closed}
      >
        <CommentComposer articleId={articleId} />
        {/* 댓글만의 실패는 이 경계가 받는다 (KAN-447) — 기사 본문은 살아남는다 */}
        <QueryBoundary
          name="ArticleComments"
          fallback={<CommentListSkeleton />}
          errorMessage="댓글을 불러오지 못했어요."
        >
          <CommentList articleId={articleId} />
        </QueryBoundary>
      </DebateParticipationGate>
    </>
  );
}
