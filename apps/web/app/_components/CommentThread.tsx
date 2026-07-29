"use client";

import { useState } from "react";
import { avatarInitials, formatCount } from "@plick/domain/format";
import { formatRelativeTime } from "@plick/domain/format";
import type { ArticleComment } from "@plick/domain/types";
import { ChevronMiniIcon, HeartMiniIcon } from "@plick/ui/icons";
import { CommentComposer } from "./CommentComposer";

/**
 * 댓글 한 스레드 — 원 댓글 + (있으면) 접힌 답글들. 기사 세부·릴 세부 패널 공용.
 *
 * 답글은 기본으로 접혀 있고 "답글 N개"를 눌러야 펼쳐진다(피그마 W2 기사 세부,
 * 모바일도 KAN-307에서 같은 모양이 됐다). 내가 답글을 새로 달면 바로 보이도록
 * 자동으로 펼친다.
 *
 * "답글"을 누르면 유튜브처럼 그 원 댓글 바로 밑에 답글 입력바가 인라인으로
 * 생긴다(기존 답글들 위). 열림 상태는 스레드마다 각자 든다 — 스레드 여러 개가
 * 동시에 열려도 서로 간섭하지 않는다. 등록 성공·취소가 입력바를 접는다.
 *
 * @param articleId 이 댓글이 달린 기사(릴) id — 인라인 답글 작성에 쓴다
 * @param onPosted 답글 등록 성공 시 호출 — 호출부가 헤더 카운트를 올리는 데 쓴다
 */
export function CommentThread({
  comment,
  articleId,
  onPosted,
}: {
  comment: ArticleComment;
  articleId: string;
  onPosted?: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasReplies = comment.replies.length > 0;

  return (
    <div className="flex flex-col gap-3.75">
      <CommentItem comment={comment} onReply={() => setReplying(true)} />

      {replying && (
        <CommentComposer
          articleId={articleId}
          parentCommentId={comment.id}
          onCancel={() => setReplying(false)}
          onPosted={() => {
            setExpanded(true);
            onPosted?.();
          }}
          className="pl-10"
        />
      )}

      {hasReplies && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="text-accent text-label focus-visible:outline-accent ml-10 flex w-fit items-center gap-1.25 rounded font-semibold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          답글 {comment.replies.length}개
          <ChevronMiniIcon
            size={14}
            className={`transition-transform ${expanded ? "-rotate-90" : "rotate-90"}`}
          />
        </button>
      )}

      {expanded &&
        comment.replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} reply />
        ))}
    </div>
  );
}

/**
 * 댓글 한 줄 (아바타 + 작성자/시간 + 본문 + 좋아요·답글).
 *
 * 삭제된 댓글은 목록에서 빠지지 않고 tombstone으로 온다(`content` null) —
 * 답글이 딸린 원 댓글이 지워져도 답글은 계속 보여야 해서다. 본문 자리에
 * 안내 문구만 남기고 액션 줄은 감춘다.
 *
 * 답글 버튼은 원 댓글에만 둔다 — BE가 대댓글의 답글도 막지는 않지만 조회가
 * 최상위 아래로 평탄화되므로 화면은 1단까지만 연다(KAN-303, be-verify 확인).
 * 좋아요는 아직 표시 전용이다 — 댓글 좋아요는 별도 엔드포인트라 그 이식 티켓
 * 몫이고, 비로그인 조회에서는 `liked`가 항상 false로 온다.
 *
 * @param reply - 답글이면 들여쓰기 + 작은 아바타로 렌더
 * @param onReply - "답글" 클릭 콜백. 없거나 답글 행이면 버튼을 그리지 않는다
 */
function CommentItem({
  comment,
  reply,
  onReply,
}: {
  comment: ArticleComment;
  reply?: boolean;
  onReply?: () => void;
}) {
  return (
    <div className={`flex gap-2.5 ${reply ? "pl-10" : ""}`}>
      <span
        className={`bg-avatar text-icon rounded-pill text-micro flex shrink-0 items-center justify-center font-extrabold ${
          reply ? "size-6.5" : "size-8"
        }`}
      >
        {avatarInitials(comment.nickname)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.25">
        <div className="flex items-baseline gap-2">
          <span className="text-label text-text font-bold">
            {comment.nickname}
          </span>
          {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게
              달라진다("11분 전"→"12분 전") — 불일치 경고를 눌러 둔다 */}
          <span className="text-caption text-text-4" suppressHydrationWarning>
            {formatRelativeTime(comment.createdAt)}
            {comment.isEdited && " · 수정됨"}
          </span>
        </div>
        {comment.isDeleted ? (
          <p className="text-body text-text-4 leading-body">
            삭제된 댓글이에요.
          </p>
        ) : (
          <>
            <p className="text-body text-text-2 leading-body">
              {comment.content}
            </p>
            <div className="flex items-center gap-4 pt-0.5">
              <span
                className={`flex items-center gap-1.25 ${
                  comment.liked ? "text-accent" : "text-text-4"
                }`}
              >
                <HeartMiniIcon size={13} filled={comment.liked} />
                <span className="text-caption font-semibold">
                  {formatCount(comment.likeCount)}
                </span>
              </span>
              {!reply && onReply && (
                <button
                  type="button"
                  onClick={onReply}
                  className="text-caption text-text-4 hover:text-text-3 focus-visible:outline-accent rounded font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  답글
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
