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
    <div className="drop-shadow-media absolute right-3.5 bottom-27 flex flex-col items-center gap-5.5">
      {/* 아이콘 뭉치 뒤 배경 — 그라데이션 스크림이 아니라 살짝만 비치는(70%)
          검은 알약을 깐다. 밝은 사진 위에서도 대비로 아이콘이 확실히 읽힌다.
          -z-10이라 아이콘들 뒤에 깔린다(레일의 drop-shadow가 만드는 stacking
          context 안이라 릴 뒤로는 안 빠진다) (KAN-296) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-1.5 -inset-y-2 -z-10 rounded-[1.5rem]"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--plk-scrim) 70%, transparent)",
        }}
      />
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
