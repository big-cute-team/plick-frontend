import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import { ChatIcon, LikeIcon, SendIcon } from "@plick/ui/icons";
import type { ReelCard } from "@plick/domain/types";

/**
 * 릴 오른쪽 세로 액션 레일, 좋아요·댓글·공유 (시안 KAN-567). 저장은 계약에 없어
 * 뺐다 (KAN-299). 미디어 상자 밑 정보 블록 오른쪽에 세로로 선다(사진 위 오버레이가
 * 아니라 흰 바탕이라 그림자가 없다).
 *
 * 좋아요는 하트 26 + 수 11/700이고 눌리면 하트와 수가 빨강으로 찬다 (KAN-308).
 * 댓글은 말풍선 25 + 빨간 수, 공유는 종이비행기 25 + "공유"다. 토글 로직과 상태
 * 반영은 부모가 {@link useReelLike}로 들고 있고 여기는 표시와 탭만 맡는다.
 * 비로그인 시트도 부모 층이 그린다.
 *
 * @param onLike - 하트 탭 시 호출
 * @param onComment - 댓글 아이콘 탭 시 호출 (세부 시트 열기)
 * @param onShare - 공유 아이콘 탭 시 호출 (링크 공유 시트 열기, KAN-312)
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
    <div className="flex shrink-0 flex-col items-center gap-3.5">
      <RailAction
        icon={<LikeIcon size={26} filled={reel.liked} />}
        label={formatCount(reel.likeCount)}
        onClick={onLike}
        tone={reel.liked ? "danger" : "default"}
        ariaLabel={reel.liked ? "좋아요 취소" : "좋아요"}
        ariaPressed={reel.liked}
      />
      <RailAction
        icon={<ChatIcon size={25} />}
        label={formatCount(reel.commentCount)}
        onClick={onComment}
        tone="count"
        ariaLabel="댓글"
      />
      <RailAction
        icon={<SendIcon size={25} />}
        label="공유"
        onClick={onShare}
      />
    </div>
  );
}

/**
 * 액션 레일 버튼 하나 (아이콘 + 라벨). 아이콘은 text-2, 라벨은 text-3가 기본이다.
 *
 * @param tone - `danger`는 눌린 좋아요(아이콘·수 전부 빨강), `count`는 댓글 수만 빨강
 * @param ariaLabel - 라벨이 숫자뿐이라 스크린리더가 무슨 버튼인지 못 읽는 자리에 단다
 * @param ariaPressed - 토글 버튼이면 눌린 상태
 */
function RailAction({
  icon,
  label,
  onClick,
  tone = "default",
  ariaLabel,
  ariaPressed,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger" | "count";
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
        tone === "danger" ? "text-danger" : "text-text-2"
      } flex flex-col items-center gap-0.75 active:opacity-60`}
    >
      {icon}
      <span
        className={`text-caption font-bold ${
          tone === "danger"
            ? "text-danger"
            : tone === "count"
              ? "text-danger"
              : "text-text-3"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
