import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import { ChatIcon, LikeIcon, SendIcon } from "@plick/ui/icons";
import type { ReelCard } from "@plick/domain/types";

/**
 * 릴 오른쪽 세로 액션 레일, 좋아요·댓글·공유. 저장은 계약에 없어 뺐다 (KAN-299).
 * 릴 오른쪽 아래에 본문색 아이콘으로 겹쳐 선다(KAN-569에서 전 배치로 되돌렸고,
 * KAN-574에서 흰 아이콘과 그림자를 걷었다).
 *
 * 좋아요는 핑크다 (KAN-742). 누르기 전엔 빈 하트에 얇은 수, 누르면 찬 하트에 볼드 수다. 토글 로직과
 * 상태 반영은 부모가 {@link useReelLike}로 들고 있고 여기는 표시와 탭만 맡는다.
 * 비로그인 시트는 부모 층이 그린다. 레일에 필터나 transform이 걸리면 화면 전체
 * 오버레이의 기준 상자가 레일이 돼 시트가 레일만 덮는다.
 *
 * @param liked - 내가 좋아요를 눌렀는가. 카드가 아니라 내 상태 캐시 값이다 (KAN-664)
 * @param onLike - 하트 탭 시 호출
 * @param onComment - 댓글 아이콘 탭 시 호출 (세부 시트 열기)
 * @param onShare - 공유 아이콘 탭 시 호출 (링크 공유 시트 열기, KAN-312)
 */
export function ReelActionRail({
  reel,
  liked,
  onLike,
  onComment,
  onShare,
}: {
  reel: ReelCard;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  return (
    <div className="absolute right-3.5 bottom-27 flex flex-col items-center gap-5.5">
      <RailAction
        icon={<LikeIcon size={34} filled={liked} />}
        label={formatCount(reel.likeCount)}
        onClick={onLike}
        like
        active={liked}
        ariaLabel="좋아요"
        ariaPressed={liked}
      />
      <RailAction
        icon={<ChatIcon size={33} />}
        label={formatCount(reel.commentCount)}
        onClick={onComment}
        ariaLabel="댓글"
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
 * 액션 레일 버튼 하나 (아이콘 + 라벨). 밝은 바탕 위라 본문색이다 (KAN-574).
 *
 * @param like - 좋아요 버튼이면 아이콘과 수가 핑크다
 * @param active - 눌린 좋아요면 수가 볼드, 아니면 얇다
 * @param ariaLabel - 라벨이 숫자뿐이라 스크린리더가 무슨 버튼인지 못 읽는 자리에 단다. 보이는 숫자를
 *   뒤에 붙여 이름에 담는다(음성 명령은 보이는 글자로 부른다, label-content-name-mismatch, KAN-670)
 * @param ariaPressed - 토글 버튼이면 눌린 상태
 */
function RailAction({
  icon,
  label,
  onClick,
  like,
  active,
  ariaLabel,
  ariaPressed,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  like?: boolean;
  active?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel && `${ariaLabel} ${label}`}
      aria-pressed={ariaPressed}
      className={`${
        like ? "text-like" : "text-text-strong"
      } flex flex-col items-center gap-1.25 active:opacity-60`}
    >
      {icon}
      <span
        className={`text-label ${like && !active ? "font-light" : "font-bold"}`}
      >
        {label}
      </span>
    </button>
  );
}
