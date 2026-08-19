"use client";

import type { InitialCommentPage } from "@plick/domain/types";
import { useComments } from "@/_hooks/useComments";
import { CommentThread } from "./CommentThread";

/**
 * 댓글 목록 (KAN-303, web 이식 KAN-329) — 로딩·에러·빈 상태와 "댓글 더 보기"
 * 페이지네이션까지 담는 클라 컴포넌트. 기사 세부·릴 세부 패널 공용.
 *
 * 새 댓글은 여기서 그리지 않아도 나타난다 — 작성 뮤테이션(`useCreateComment`)이
 * 같은 쿼리키의 캐시에 성공 응답을 끼워 넣는다(원 댓글은 맨 앞, 답글은 부모 밑).
 * 답글 입력바는 각 스레드가 인라인으로 연다(`CommentThread`).
 *
 * @param articleId 기사(릴) id
 * @param initial 서버가 미리 받아 둔 첫 페이지(기사 세부). 릴 세부 패널은 없이 들어온다.
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
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useComments(articleId, initial);

  const comments = data?.pages.flatMap((page) => page.items) ?? [];

  /* 로딩 중엔 아무것도 그리지 않는다 — 스켈레톤은 릴 전환마다 깜빡여 뺐다 (KAN-329 후속) */
  if (isPending) {
    return null;
  }

  if (isError && comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-body text-text-4">댓글을 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-border text-text-2 rounded-pill text-label hover:border-border-strong hover:text-text focus-visible:outline-accent border px-4 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-body text-text-4 py-8 text-center">
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
          className="text-label text-text-3 hover:text-text-2 focus-visible:outline-accent rounded py-2 text-center font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
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
