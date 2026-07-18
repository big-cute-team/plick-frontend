"use client";

import { useState } from "react";
import { avatarInitials, formatCount } from "@/_lib/format";
import type { Comment } from "@/_lib/types";
import { ChevronMiniIcon, HeartMiniIcon } from "@plick/ui/icons";

/**
 * 댓글 한 스레드 — 원 댓글 + (있으면) 접이식 답글 목록.
 *
 * 데스크톱 세부 패널에선 답글을 항상 펼치지 않고 "답글 N개" 토글로 여닫는다
 * (피그마 W2 기사 세부). 모바일 바텀시트가 답글을 항상 인라인으로 보여주는 것과
 * 다른 지점이라 웹 전용으로 둔다.
 */
export function CommentThread({ comment }: { comment: Comment }) {
  const [open, setOpen] = useState(false);
  const replies = comment.replies ?? [];

  return (
    <div className="flex flex-col gap-3.75">
      <CommentItem comment={comment} />

      {replies.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-accent text-label focus-visible:outline-accent ml-10 flex w-fit items-center gap-1.25 rounded font-semibold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            답글 {replies.length}개
            <ChevronMiniIcon
              size={14}
              className={`transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
            />
          </button>

          {open &&
            replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} reply />
            ))}
        </>
      )}
    </div>
  );
}

/**
 * 댓글 한 줄 (아바타 + 작성자/시간 + 본문 + 좋아요·답글).
 *
 * @param reply - 답글이면 들여쓰기 + 작은 아바타로 렌더
 */
function CommentItem({
  comment,
  reply,
}: {
  comment: Comment;
  reply?: boolean;
}) {
  return (
    <div className={`flex gap-2.5 ${reply ? "pl-10" : ""}`}>
      <span
        className={`bg-avatar text-icon rounded-pill text-micro flex shrink-0 items-center justify-center font-extrabold ${
          reply ? "size-6.5" : "size-8"
        }`}
      >
        {avatarInitials(comment.author)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.25">
        <div className="flex items-baseline gap-2">
          <span className="text-label text-text font-bold">
            {comment.author}
          </span>
          <span className="text-caption text-text-4">{comment.timeLabel}</span>
        </div>
        <p className="text-body text-text-2 leading-body">{comment.body}</p>
        <div className="flex items-center gap-4 pt-0.5">
          <button
            type="button"
            className="text-text-4 hover:text-text-3 flex items-center gap-1.25"
          >
            <HeartMiniIcon size={13} filled={comment.liked} />
            <span className="text-caption font-semibold">
              {formatCount(comment.likeCount)}
            </span>
          </button>
          <button
            type="button"
            className="text-caption text-text-4 hover:text-text-3 font-semibold"
          >
            답글
          </button>
        </div>
      </div>
    </div>
  );
}
