import type { ReactNode } from "react";
import { formatCount } from "../../_lib/format";
import type { FeedPost } from "../../_lib/types";
import {
  ChatIcon,
  LikeIcon,
  SaveIcon,
  SendIcon,
} from "../../_components/icons";
import { MediaThumb } from "../../_components/MediaThumb";
import { PostChips } from "./PostChips";

/**
 * 릴 한 장 — 풀스크린 미디어 + 스크림 + 정보 블록 + 우측 액션 레일.
 *
 * 순수 표현 컴포넌트(상태 없음). 스크롤/스냅은 ReelsFeed가 담당한다.
 *
 * @param onOpenDetail - 정보 블록(제목·기자)이나 댓글 아이콘 탭 시 호출 —
 *   ReelsFeed가 세부 바텀시트(ReelDetailSheet)를 띄운다.
 */
export function ReelItem({
  post,
  onOpenDetail,
}: {
  post: FeedPost;
  onOpenDetail: () => void;
}) {
  return (
    <section className="relative h-full w-full snap-start">
      <MediaThumb team={post.team} className="h-full">
        {/* 우측 스크림 — 액션 레일 가독성용 고정 값(테마 무관) */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-27.5"
          style={{
            backgroundImage:
              "linear-gradient(to left, rgba(5,8,14,0.55), rgba(5,8,14,0))",
          }}
        />

        {/* 하단 정보 블록 (스크림 위 텍스트) — 탭하면 세부 시트가 열린다 */}
        <button
          type="button"
          onClick={onOpenDetail}
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pt-30 pr-21 pb-27 pl-4.5 text-left"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(5,8,14,0) 0%, rgba(5,8,14,0.55) 35%, rgba(5,8,14,0.92) 100%)",
          }}
        >
          <PostChips post={post} />

          <span className="text-headline text-media-on leading-[1.32] font-extrabold tracking-[-0.4px]">
            {post.title}
          </span>

          <span className="flex items-center gap-2.25">
            <span className="border-accent text-accent rounded-badge text-micro flex size-5 items-center justify-center border font-black">
              T{post.reporter.tier}
            </span>
            <span className="text-body text-media-on font-bold">
              {post.reporter.name}
            </span>
            <span className="text-label text-media-on-dim">
              · {post.timeLabel}
            </span>
          </span>
        </button>

        {/* 우측 액션 레일 */}
        <div className="absolute right-3.5 bottom-52.5 flex flex-col items-center gap-5.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
          <RailAction
            icon={<LikeIcon size={28} filled={post.liked} />}
            label={formatCount(post.likeCount)}
          />
          <RailAction
            icon={<ChatIcon size={27} />}
            label={formatCount(post.commentCount)}
            onClick={onOpenDetail}
          />
          <RailAction icon={<SendIcon size={27} />} label="공유" />
          <RailAction
            icon={<SaveIcon size={27} filled={post.saved} />}
            label="저장"
          />
        </div>
      </MediaThumb>
    </section>
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
