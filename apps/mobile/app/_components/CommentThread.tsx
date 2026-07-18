import { avatarInitials, formatCount } from "@plick/domain/format";
import type { Comment } from "@plick/domain/types";
import { HeartMiniIcon } from "@plick/ui/icons";

/** 댓글 한 스레드 — 원 댓글 + (있으면) 들여쓴 답글들. */
export function CommentThread({ comment }: { comment: Comment }) {
  return (
    <div className="flex flex-col gap-3.75">
      <CommentItem comment={comment} />
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} reply />
      ))}
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
            className="text-text-4 flex items-center gap-1.25 active:opacity-60"
          >
            <HeartMiniIcon size={13} filled={comment.liked} />
            <span className="text-caption font-semibold">
              {formatCount(comment.likeCount)}
            </span>
          </button>
          <button
            type="button"
            className="text-caption text-text-4 font-semibold active:opacity-60"
          >
            답글
          </button>
        </div>
      </div>
    </div>
  );
}
