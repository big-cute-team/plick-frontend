import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import { ChatIcon, LikeIcon, SendIcon } from "@plick/ui/icons";

/**
 * 레일 배경 톤 — 놓이는 바탕에 따라 색을 달리한다.
 * - `media`: 사진 위(모바일 오버레이) — 테마 무관 흰색 계열.
 * - `surface`: 페이지 배경 위(데스크톱 카드 밖) — 테마 텍스트·서피스 색이라 라이트·다크
 *   양쪽 배경에서 보인다(흰색 고정이면 라이트 배경에서 사라진다).
 */
type RailTone = "media" | "surface";

const TONE: Record<RailTone, { button: string; chip: string }> = {
  media: {
    button: "text-media-on",
    chip: "bg-media-chip group-hover:bg-media-chip-border",
  },
  surface: {
    button: "text-text",
    chip: "bg-elevate group-hover:bg-elevate-2",
  },
};

/**
 * 릴 액션 레일 — 좋아요·댓글·공유. 각 아이콘이 원형 칩 배경 위에 놓인다.
 *
 * 데스크톱은 카드 밖에 세로로 서고(`ReelItem`에서 flex 형제), 모바일 뷰에선
 * 사진이 좁아지지 않도록 카드 안 우측에 오버레이한다 — 배치는 `className`으로 제어한다.
 *
 * 저장 버튼은 실계약(KAN-323)으로 갈아타면서 뺐다 — BE 응답에 저장 여부가 없다
 * (모바일 KAN-299와 같은 판단).
 *
 * 좋아요는 눌리는 즉시 하트가 차고 카운트가 오른다 (KAN-330). 토글 로직과 상태
 * 반영, 비로그인 팝업은 부모(`ReelItem`)가 {@link useReelLike}로 들고 있고 여기는
 * 표시와 클릭만 맡는다 — 레일이 데스크톱·모바일 뷰로 두 벌 붙어 있어 각자 훅을
 * 들면 팝업도 두 벌이 되고, 어느 쪽이 떠 있는지가 뷰포트에 좌우된다.
 *
 * @param className - 래퍼에 덧붙일 클래스(표시·위치 제어: `max-lg:hidden`, `absolute … lg:hidden` 등)
 * @param tone - 바탕 톤(`media`=사진 위 흰색, `surface`=페이지 배경 위 테마색). 기본 `media`.
 * @param onLike - 하트 클릭 시 호출
 * @param onOpenComments - 댓글 버튼 클릭 시 세부 패널을 여는 콜백
 */
export function ReelActionRail({
  reel,
  className = "",
  tone = "media",
  onLike,
  onOpenComments,
}: {
  reel: ReelCard;
  className?: string;
  tone?: RailTone;
  onLike?: () => void;
  onOpenComments?: () => void;
}) {
  const t = TONE[tone];
  return (
    <div className={`flex flex-col items-center gap-4 pb-2 ${className}`}>
      <RailAction
        tone={t}
        icon={<LikeIcon size={22} filled={reel.liked} />}
        label={formatCount(reel.likeCount)}
        onClick={onLike}
        active={reel.liked}
        ariaLabel={reel.liked ? "좋아요 취소" : "좋아요"}
        ariaPressed={reel.liked}
      />
      <RailAction
        tone={t}
        icon={<ChatIcon size={22} />}
        label={formatCount(reel.commentCount)}
        onClick={onOpenComments}
      />
      <RailAction tone={t} icon={<SendIcon size={22} />} label="공유" />
    </div>
  );
}

/**
 * 레일 버튼 하나 — 원형 아이콘 칩 + 라벨.
 *
 * @param active - 켜진 토글이면 아이콘과 숫자를 강조색으로 (기사 세부 좋아요 알약과
 *   같은 신호). 톤 색을 덮으므로 사진 위·페이지 배경 위 어디서든 같게 읽힌다
 * @param ariaLabel - 라벨이 숫자뿐이라 스크린리더가 무슨 버튼인지 못 읽는 자리에 단다
 * @param ariaPressed - 토글 버튼이면 눌린 상태
 */
function RailAction({
  icon,
  label,
  tone,
  onClick,
  active,
  ariaLabel,
  ariaPressed,
}: {
  icon: ReactNode;
  label: string;
  tone: { button: string; chip: string };
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
      className={`${active ? "text-accent" : tone.button} group flex flex-col items-center gap-1.25`}
    >
      <span
        className={`${tone.chip} group-focus-visible:outline-accent grid size-12 place-items-center rounded-full transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2`}
      >
        {icon}
      </span>
      <span className="text-caption font-semibold">{label}</span>
    </button>
  );
}
