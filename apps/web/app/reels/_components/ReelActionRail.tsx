import type { ReactNode } from "react";
import { formatCount } from "@/_lib/format";
import type { FeedPost } from "@/_lib/types";
import { ChatIcon, LikeIcon, SaveIcon, SendIcon } from "@plick/ui/icons";

/**
 * 릴 액션 레일 — 좋아요·댓글·공유·저장. 각 아이콘이 원형 칩 배경 위에 놓인다.
 *
 * 데스크톱은 카드 밖에 세로로 서고(`ReelCard`에서 flex 형제), 모바일 뷰에선
 * 사진이 좁아지지 않도록 카드 안 우측에 오버레이한다 — 배치는 `className`으로 제어한다.
 *
 * @param className - 래퍼에 덧붙일 클래스(표시·위치 제어: `max-lg:hidden`, `absolute … lg:hidden` 등)
 */
export function ReelActionRail({
  post,
  className = "",
}: {
  post: FeedPost;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-4 pb-2 ${className}`}>
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
