import type { ReactNode } from "react";
import { formatCount } from "@/_lib/format";
import type { FeedPost } from "@/_lib/types";
import { ChatIcon, LikeIcon, SaveIcon, SendIcon } from "@plick/ui/icons";

/**
 * 릴 우측 액션 레일 (데스크톱) — 좋아요·댓글·공유·저장.
 *
 * 모바일 레일과 달리 카드 밖에 세로로 서고, 각 아이콘이 원형 칩 배경 위에 놓인다.
 */
export function ReelActionRail({ post }: { post: FeedPost }) {
  return (
    <div className="flex flex-col items-center gap-4 pb-2">
      <RailAction
        icon={<LikeIcon size={22} filled={post.liked} />}
        label={formatCount(post.likeCount)}
      />
      <RailAction
        icon={<ChatIcon size={22} />}
        label={formatCount(post.commentCount)}
      />
      <RailAction icon={<SendIcon size={22} />} label="공유" />
      <RailAction
        icon={<SaveIcon size={22} filled={post.saved} />}
        label="저장"
      />
    </div>
  );
}

/** 레일 버튼 하나 — 원형 아이콘 칩 + 라벨. */
function RailAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="text-media-on group flex flex-col items-center gap-1.25"
    >
      <span className="bg-media-chip group-hover:bg-media-chip-border group-focus-visible:outline-accent grid size-12 place-items-center rounded-full transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2">
        {icon}
      </span>
      <span className="text-caption font-semibold">{label}</span>
    </button>
  );
}
