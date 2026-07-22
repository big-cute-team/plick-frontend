"use client";

import { CloseIcon, LinkOutIcon } from "@plick/ui/icons";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { TagChips } from "@plick/ui/TagChips";
import { formatCount } from "@plick/domain/format";
import type { FeedPost } from "@plick/domain/types";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { CommentThread } from "@/_components/CommentThread";
import { SHEET_HEIGHT_RATIO, SHEET_TRANSITION } from "@/_constants/reels";
import type { ReelDetailMotion } from "@/_types/reels";

/**
 * 릴 세부 바텀시트 (KAN-168, 피그마 75-6 "V2 기사 세부").
 *
 * 기자 줄(그랩 존)·본문·해시태그·댓글·입력바를 담고 아래에서 올라온다.
 * 칩·제목은 이 컴포넌트가 그리지 않는다 — 릴에 원래 있던 요소(ReelItem)가
 * 같은 motion 상태로 시트 라인 위까지 따라 올라온다.
 *
 * 닫기: 그랩 존 드래그 다운 또는 X 버튼 → 내려간 뒤 motion이 스스로 언마운트.
 *
 * @param post - 세부를 보여줄 게시물
 * @param motion - useReelDetailMotion()이 만든 개폐·드래그 상태 (ReelsFeed 소유)
 */
export function ReelDetailSheet({
  post,
  motion,
}: {
  post: FeedPost;
  motion: ReelDetailMotion;
}) {
  return (
    <div className="absolute inset-0 z-20">
      {/* 시트 본체 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="기사 세부"
        className="bg-bg rounded-t-sheet absolute inset-x-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          height: `${SHEET_HEIGHT_RATIO * 100}%`,
          transform: motion.shown
            ? `translateY(${motion.dragY}px)`
            : "translateY(100%)",
          transition: motion.dragging ? "none" : SHEET_TRANSITION,
        }}
        onTransitionEnd={motion.onTransitionEnd}
      >
        {/* 그랩 존(기자 줄) — 잡고 끌어내리면 닫힌다 */}
        <div className="relative shrink-0">
          <div
            className="px-edge touch-none pt-5.5 select-none"
            {...motion.grabProps}
          >
            <ReporterLine
              reporter={post.reporter}
              meta={`· ${post.timeLabel} · 조회 ${formatCount(post.views)}`}
              className="pr-11"
            />
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={motion.requestClose}
            className="bg-elevate text-icon rounded-pill absolute top-3 right-3 flex size-8.5 items-center justify-center active:opacity-60"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* 본문·해시태그·댓글 스크롤 영역 */}
        <div className="no-scrollbar px-edge flex flex-1 flex-col gap-3.75 overflow-y-auto overscroll-contain pt-3.75 pb-6">
          <p className="text-body-lg text-text-2 leading-body-lg tracking-snug">
            {post.summary}
          </p>

          <div className="flex items-center gap-2">
            <TagChips tags={post.tags ?? []} />
            <button
              type="button"
              className="text-accent text-label ml-auto flex items-center gap-1.25 font-bold active:opacity-60"
            >
              <LinkOutIcon size={13} />
              출처 원문 보기
            </button>
          </div>

          <CommentsHeader
            count={post.commentCount}
            className="border-border border-t pt-3.5"
          />

          {(post.comments ?? []).map((comment) => (
            <CommentThread key={comment.id} comment={comment} />
          ))}
        </div>

        {/* 댓글 입력바 — 홈 인디케이터/제스처 영역을 피해 pb에 safe-area를 더한다 */}
        <div
          className="border-border bg-nav shrink-0 border-t px-4 pt-3.25"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 13px)" }}
        >
          <CommentComposer />
        </div>
      </div>
    </div>
  );
}
