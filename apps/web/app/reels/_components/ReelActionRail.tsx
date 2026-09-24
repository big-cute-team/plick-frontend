import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import {
  ChatIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LikeIcon,
  SendIcon,
} from "@plick/ui/icons";

/**
 * 레일 배경 톤 — 놓이는 바탕에 따라 색을 달리한다.
 * - `media`: 사진 위(좁은 폭 오버레이). 테마 무관 흰색 계열.
 * - `surface`: 페이지 바탕(bg-chip) 위, 데스크톱 카드 밖. 시안의 회색 원(#e6e9ec, bg-avatar)에
 *   본문색 아이콘이다 (KAN-567).
 */
type RailTone = "media" | "surface";

const TONE: Record<RailTone, { button: string; chip: string }> = {
  media: {
    button: "text-media-on",
    chip: "bg-media-chip group-hover:bg-media-chip-border",
  },
  surface: {
    button: "text-text",
    chip: "bg-avatar group-hover:bg-chip",
  },
};

/**
 * 릴 액션 레일 — 좋아요, 댓글, 공유 원 버튼 48px + 라벨 11.5/700. 시안(KAN-567, 웹 릴스
 * 428-470행)대로 아래에 1px 구분선을 두고 이전, 다음 릴 화살표 34px 상자를 붙인다.
 * 화살표는 데스크톱 레일에만 있다 (`onPrev`, `onNext`를 넘긴 쪽에만 그린다).
 *
 * 데스크톱은 카드 밖에 세로로 서고(`ReelItem`에서 flex 형제), 좁은 폭에선
 * 사진이 좁아지지 않도록 카드 안 우측에 오버레이한다. 배치는 `className`으로 제어한다.
 *
 * 저장 버튼은 실계약(KAN-323)으로 갈아타면서 뺐다. BE 응답에 저장 여부가 없다
 * (모바일 KAN-299와 같은 판단).
 *
 * 좋아요는 눌리는 즉시 하트가 차고 카운트가 오른다 (KAN-330). 토글 로직과 상태
 * 반영, 비로그인 팝업은 부모(`ReelItem`)가 `useReelLike`로 들고 있고 여기는
 * 표시와 클릭만 맡는다. 레일이 데스크톱, 좁은 폭으로 두 벌 붙어 있어 각자 훅을
 * 들면 팝업도 두 벌이 되고, 어느 쪽이 떠 있는지가 뷰포트에 좌우된다.
 *
 * @param className - 래퍼에 덧붙일 클래스(표시, 위치 제어)
 * @param tone - 바탕 톤(`media`=사진 위 흰색, `surface`=페이지 바탕 위). 기본 `media`
 * @param onLike - 하트 클릭 시 호출
 * @param onOpenComments - 댓글 버튼 클릭 시 세부 패널을 여는 콜백
 * @param onShare - 공유 버튼 클릭 시 호출 (링크 공유 팝업 열기, KAN-349)
 * @param onPrev - 이전 릴로. 첫 릴이면 undefined로 넘겨 버튼을 잠근다
 * @param onNext - 다음 릴로. 마지막 릴이면 undefined로 넘겨 버튼을 잠근다
 * @param navigable - 화살표 상자를 그릴지. 데스크톱 레일만 true
 */
export function ReelActionRail({
  reel,
  className = "",
  tone = "media",
  onLike,
  onOpenComments,
  onShare,
  onPrev,
  onNext,
  navigable = false,
}: {
  reel: ReelCard;
  className?: string;
  tone?: RailTone;
  onLike?: () => void;
  onOpenComments?: () => void;
  onShare?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  navigable?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div className={`flex flex-col items-center gap-4.5 pb-2.5 ${className}`}>
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
        ariaLabel="댓글 보기"
      />
      <RailAction
        tone={t}
        icon={<SendIcon size={22} />}
        label="공유"
        onClick={onShare}
      />

      {navigable && (
        <>
          <span aria-hidden className="bg-border-strong h-3.5 w-px" />
          <NavButton label="이전 릴" onClick={onPrev}>
            <ChevronUpIcon size={16} />
          </NavButton>
          <NavButton label="다음 릴" onClick={onNext}>
            <ChevronDownIcon size={16} />
          </NavButton>
        </>
      )}
    </div>
  );
}

/**
 * 레일 버튼 하나 — 원 아이콘 칩 + 라벨.
 *
 * @param active - 켜진 토글이면 하트와 숫자를 빨강으로 (시안: 눌린 하트만 빨강, KAN-567)
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
      className={`${active ? "text-danger" : tone.button} group flex flex-col items-center gap-1.25`}
    >
      <span
        className={`${tone.chip} group-focus-visible:outline-accent grid size-12 place-items-center rounded-full transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2`}
      >
        {icon}
      </span>
      <span className="text-caption-lg font-bold">{label}</span>
    </button>
  );
}

/** 이전, 다음 릴 상자 34px. 테두리 상자에 hover면 테두리와 글자가 강조색이 된다. */
function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={!onClick}
      className="border-border-strong text-text-3 hover:border-accent hover:text-accent focus-visible:outline-accent disabled:hover:border-border-strong disabled:hover:text-text-3 grid size-8.5 place-items-center border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
