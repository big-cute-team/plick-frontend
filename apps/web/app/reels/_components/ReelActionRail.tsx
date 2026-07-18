import type { ReactNode } from "react";
import { formatCount } from "@plick/domain/format";
import type { FeedPost } from "@plick/domain/types";
import { ChatIcon, LikeIcon, SaveIcon, SendIcon } from "@plick/ui/icons";

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
 * 릴 액션 레일 — 좋아요·댓글·공유·저장. 각 아이콘이 원형 칩 배경 위에 놓인다.
 *
 * 데스크톱은 카드 밖에 세로로 서고(`ReelCard`에서 flex 형제), 모바일 뷰에선
 * 사진이 좁아지지 않도록 카드 안 우측에 오버레이한다 — 배치는 `className`으로 제어한다.
 *
 * @param className - 래퍼에 덧붙일 클래스(표시·위치 제어: `max-lg:hidden`, `absolute … lg:hidden` 등)
 * @param tone - 바탕 톤(`media`=사진 위 흰색, `surface`=페이지 배경 위 테마색). 기본 `media`.
 * @param onOpenComments - 댓글 버튼 클릭 시 세부 패널을 여는 콜백
 */
export function ReelActionRail({
  post,
  className = "",
  tone = "media",
  onOpenComments,
}: {
  post: FeedPost;
  className?: string;
  tone?: RailTone;
  onOpenComments?: () => void;
}) {
  const t = TONE[tone];
  return (
    <div className={`flex flex-col items-center gap-4 pb-2 ${className}`}>
      <RailAction
        tone={t}
        icon={<LikeIcon size={22} filled={post.liked} />}
        label={formatCount(post.likeCount)}
      />
      <RailAction
        tone={t}
        icon={<ChatIcon size={22} />}
        label={formatCount(post.commentCount)}
        onClick={onOpenComments}
      />
      <RailAction tone={t} icon={<SendIcon size={22} />} label="공유" />
      <RailAction
        tone={t}
        icon={<SaveIcon size={22} filled={post.saved} />}
        label="저장"
      />
    </div>
  );
}

/** 레일 버튼 하나 — 원형 아이콘 칩 + 라벨. */
function RailAction({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: { button: string; chip: string };
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${tone.button} group flex flex-col items-center gap-1.25`}
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
