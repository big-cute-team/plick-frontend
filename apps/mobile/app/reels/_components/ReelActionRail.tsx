import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import { ChatIcon, LikeIcon, SendIcon } from "@plick/ui/icons";
import type { ReelCard } from "@plick/domain/types";

/**
 * 릴 우측 액션 레일 — 좋아요·댓글·공유. 저장은 계약에 없어 뺐다 (KAN-299).
 *
 * 좋아요는 눌리는 즉시 하트가 차고 카운트가 오른다 (KAN-308). 토글 로직과 상태
 * 반영은 부모가 {@link useReelLike}로 들고 있고 여기는 표시와 탭만 맡는다 —
 * 비로그인 팝업을 이 안에서 그리면 레일에 걸린 `drop-shadow` 필터가 화면 전체
 * 오버레이의 기준 상자가 돼 팝업이 레일만 덮는다.
 *
 * @param onLike - 하트 탭 시 호출
 * @param onComment - 댓글 아이콘 탭 시 호출 (세부 시트 열기)
 * @param onShare - 공유 아이콘 탭 시 호출 (링크 공유 팝업 열기, KAN-312).
 *   팝업도 좋아요 팝업과 같은 이유로 부모가 그린다
 */
export function ReelActionRail({
  reel,
  onLike,
  onComment,
  onShare,
}: {
  reel: ReelCard;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  return (
    <div className="drop-shadow-media absolute right-3.5 bottom-27 flex flex-col items-center gap-5.5">
      <RailAction
        icon={<LikeIcon size={34} filled={reel.liked} />}
        label={formatCount(reel.likeCount)}
        onClick={onLike}
        active={reel.liked}
        ariaLabel={reel.liked ? "좋아요 취소" : "좋아요"}
        ariaPressed={reel.liked}
      />
      <RailAction
        icon={<ChatIcon size={33} />}
        label={formatCount(reel.commentCount)}
        onClick={onComment}
      />
      <RailAction
        icon={<SendIcon size={33} />}
        label="공유"
        onClick={onShare}
      />
    </div>
  );
}

/**
 * 액션 레일 버튼 하나 (아이콘 + 라벨).
 *
 * @param active - 켜진 토글이면 아이콘과 숫자를 강조색으로 (기사 세부 좋아요 알약과 같은 신호)
 * @param ariaLabel - 라벨이 숫자뿐이라 스크린리더가 무슨 버튼인지 못 읽는 자리에 단다
 * @param ariaPressed - 토글 버튼이면 눌린 상태
 */
function RailAction({
  icon,
  label,
  onClick,
  active,
  ariaLabel,
  ariaPressed,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`${
        active ? "text-accent" : "text-media-on"
      } flex flex-col items-center gap-1.25 active:opacity-60`}
    >
      {icon}
      <span className="text-label font-semibold">{label}</span>
    </button>
  );
}
