import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import type { FeedPost } from "@plick/domain/types";
import { ChatIcon, LikeIcon, SaveIcon, SendIcon } from "@plick/ui/icons";

/**
 * 릴 우측 액션 레일 — 좋아요·댓글·공유·저장.
 *
 * @param onComment - 댓글 아이콘 탭 시 호출 (세부 시트 열기)
 */
export function ReelActionRail({
  post,
  onComment,
}: {
  post: FeedPost;
  onComment: () => void;
}) {
  return (
    <div className="absolute right-3.5 bottom-52.5 flex flex-col items-center gap-5.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
      <RailAction
        icon={<LikeIcon size={28} filled={post.liked} />}
        label={formatCount(post.likeCount)}
      />
      <RailAction
        icon={<ChatIcon size={27} />}
        label={formatCount(post.commentCount)}
        onClick={onComment}
      />
      <RailAction icon={<SendIcon size={27} />} label="공유" />
      <RailAction
        icon={<SaveIcon size={27} filled={post.saved} />}
        label="저장"
      />
    </div>
  );
}

/** 액션 레일 버튼 하나 (아이콘 + 라벨). */
function RailAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-media-on flex flex-col items-center gap-1.25 active:opacity-60"
    >
      {icon}
      <span className="text-caption font-semibold">{label}</span>
    </button>
  );
}
