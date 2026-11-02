"use client";

import type { Debate } from "@plick/domain/types";
import { DebateParticipationGate } from "@/_components/DebateParticipationGate";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentList } from "@/_components/CommentList";
import { CommentsHeader } from "@/_components/CommentsHeader";

/**
 * 기사 세부의 댓글 섹션 (KAN-329, 시안 KAN-567) — 헤더 카운트·입력바·목록을 묶는 클라 경계.
 * 여백은 시안대로 관련 기사 밑 34px, 헤더 밑 12px이다.
 * 모바일 `ArticleComments`와 같은 구성이다.
 *
 * 댓글 수는 기사별 캐시에서 읽고 작성·삭제 훅이 갱신한다. 투표 의견 창의 저장도
 * 같은 카운트에 반영된다(KAN-705). 답글 입력바는 각 스레드가 인라인으로 연다.
 *
 * 목록은 브라우저에서만 받는다 (KAN-667, 모바일 KAN-664). 페이지가 익명 ISR이 되면서 서버
 * 씨앗이 없어졌다. 웹의 목록 훅은 suspense가 아니라 서버 렌더에서 아무것도 받지 않고 빈 채로
 * 그리므로, 모바일처럼 `ssr: false`로 감쌀 필요 없이 마운트 뒤 받는다.
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
      <CommentsHeader
        articleId={articleId}
        count={initialCount}
        className="mt-8.5 pb-3"
      />
      <DebateParticipationGate
        articleId={articleId}
        debate={debate}
        closed={closed}
      >
        <CommentComposer articleId={articleId} className="pb-1" />
        <CommentList articleId={articleId} />
      </DebateParticipationGate>
    </>
  );
}
