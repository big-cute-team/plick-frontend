"use client";

import type { InitialCommentPage } from "@plick/domain/types";
import { useComments } from "@/_hooks/useComments";
import { CommentThread } from "./CommentThread";

/**
 * 댓글 목록 (KAN-303) — 기사 세부·릴 세부 시트 공용.
 *
 * 성공 케이스만 그린다 (KAN-447). 훅이 suspense라 로딩은 감싼 QueryBoundary의
 * fallback(`CommentListSkeleton`)이, 첫 페이지 실패는 같은 경계의 에러 UI가
 * 받는다 — 여기 있던 isPending·isError 분기를 경계 선언으로 옮겼다. 다음 페이지
 * 실패는 데이터가 있는 실패라 던지지 않고, 아래 버튼이 재시도 문구로 바뀐다.
 *
 * 새 댓글은 여기서 그리지 않아도 나타난다 — 작성 뮤테이션(`useCreateComment`)이
 * 같은 쿼리키의 캐시에 성공 응답을 끼워 넣는다(원 댓글은 맨 앞, 답글은 부모 밑).
 * 답글 입력바는 각 스레드가 인라인으로 연다(`CommentThread`).
 *
 * @param articleId 기사(릴) id
 * @param initial 서버가 미리 받아 둔 첫 페이지(기사 세부). 릴 시트는 없이 들어온다.
 * @param onPosted 답글 등록 성공 시 호출 — 호출부가 헤더 카운트를 올리는 데 쓴다
 * @param onDeleted 댓글(답글) 삭제 성공 시 호출 — 호출부가 헤더 카운트를 내리는 데 쓴다
 */
export function CommentList({
  articleId,
  initial,
  onPosted,
  onDeleted,
}: {
  articleId: string;
  initial?: InitialCommentPage;
  onPosted?: () => void;
  onDeleted?: () => void;
}) {
  const {
    data,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
  } = useComments(articleId, initial);

  const comments = data.pages.flatMap((page) => page.items);

  if (comments.length === 0) {
    return (
      <p className="text-body text-text-4 py-4 text-center">
        아직 댓글이 없어요
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.75">
      {comments.map((comment) => (
        <CommentThread
          key={comment.id}
          comment={comment}
          articleId={articleId}
          onPosted={onPosted}
          onDeleted={onDeleted}
        />
      ))}

      {(hasNextPage || isFetchNextPageError) && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="text-label text-text-3 py-2 text-center font-semibold active:opacity-60 disabled:opacity-40"
        >
          {isFetchingNextPage
            ? "불러오는 중…"
            : isFetchNextPageError
              ? "더 불러오지 못했어요 · 다시 시도"
              : "댓글 더 보기"}
        </button>
      )}
    </div>
  );
}

/** 댓글 로딩 자리 — QueryBoundary의 Suspense fallback으로 쓴다. */
export function CommentListSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3.75 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2.5">
          <div className="bg-elevate size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <div className="bg-elevate rounded-pill h-3 w-24" />
            <div className="bg-elevate rounded-pill h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
