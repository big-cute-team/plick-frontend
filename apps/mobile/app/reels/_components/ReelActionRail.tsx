import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import { ChatIcon, LikeIcon, SaveIcon, SendIcon } from "@plick/ui/icons";
import type { ReelCard } from "@/_types/reels";

/**
 * 릴 우측 액션 레일 — 좋아요·댓글·공유·저장.
 *
 * 좋아요·댓글 수는 BE가 내려주지만 집계 구현이 아직 자리표시라 전부 0으로 온다.
 * 저장 여부는 계약에 아예 없어 항상 빈 아이콘이다 (KAN-276).
 *
 * @param onComment - 댓글 아이콘 탭 시 호출 (세부 시트 열기)
 */
export function ReelActionRail({
  reel,
  onComment,
}: {
  reel: ReelCard;
  onComment: () => void;
}) {
  return (
    <div className="drop-shadow-media absolute right-3.5 bottom-52.5 flex flex-col items-center gap-5.5">
      <RailAction
        icon={<LikeIcon size={28} filled={reel.liked} />}
        label={formatCount(reel.likeCount)}
      />
      <RailAction
        icon={<ChatIcon size={27} />}
        label={formatCount(reel.commentCount)}
        onClick={onComment}
      />
      <RailAction icon={<SendIcon size={27} />} label="공유" />
      <RailAction icon={<SaveIcon size={27} />} label="저장" />
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
