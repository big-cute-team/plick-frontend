"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  TransitionEvent as ReactTransitionEvent,
} from "react";
import {
  CloseIcon,
  HeartMiniIcon,
  LinkOutIcon,
  SendMiniIcon,
} from "../../_components/icons";
import { formatCount } from "../../_lib/format";
import type { Comment, FeedPost } from "../../_lib/types";
import { PostChips } from "./PostChips";

/** 시트 상단을 이 거리(px) 이상 끌어내리면 닫는다 */
const DRAG_CLOSE_THRESHOLD = 100;

/**
 * 릴 세부 바텀시트 (KAN-168, 피그마 75-6 "V2 기사 세부").
 *
 * 릴 화면 위를 덮는 오버레이. 상단엔 미디어 스크림 + 칩/제목,
 * 하단 73%는 본문·해시태그·댓글·입력바를 담은 시트가 아래에서 올라온다.
 *
 * 닫기: 시트 윗부분(기자 줄)을 잡고 아래로 드래그하거나 X 버튼 —
 * 둘 다 시트가 아래로 내려가는 애니메이션 후 언마운트된다.
 *
 * @param post - 세부를 보여줄 게시물
 * @param onClose - 닫힘 애니메이션이 끝난 뒤 호출 (부모가 언마운트)
 */
export function ReelDetailSheet({
  post,
  onClose,
}: {
  post: FeedPost;
  onClose: () => void;
}) {
  /** false↔true 전환으로 슬라이드 업/다운을 만든다 (마운트 직후 true) */
  const [shown, setShown] = useState(false);
  /** 드래그 중 시트를 따라 내리는 오프셋(px) */
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  /* 이벤트 핸들러는 리렌더 전 stale state를 볼 수 있어 판정은 ref로 한다 */
  const draggingRef = useRef(false);
  const dragYRef = useRef(0);

  useEffect(() => {
    /* 첫 페인트(translateY 100%) 이후에 shown을 켜야 transition이 재생된다 */
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown(true)),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const onGrabPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    draggingRef.current = true;
    setDragging(true);
    /* 손가락이 그랩 존을 벗어나도 move/up을 계속 받도록 캡처 */
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onGrabPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dy = Math.max(0, e.clientY - startYRef.current);
    dragYRef.current = dy;
    setDragY(dy);
  };

  const onGrabPointerEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (dragYRef.current > DRAG_CLOSE_THRESHOLD) setShown(false);
    dragYRef.current = 0;
    setDragY(0);
  };

  const onSheetTransitionEnd = (e: ReactTransitionEvent<HTMLDivElement>) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "transform" &&
      !shown
    )
      onClose();
  };

  return (
    <div className="absolute inset-0 z-20">
      {/* 상단 미디어 스크림 — 사진 위 고정 값(테마 무관) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-84 transition-opacity duration-300"
        style={{
          opacity: shown ? 1 : 0,
          backgroundImage:
            "linear-gradient(180deg, rgba(5,8,14,0.42) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 48%, rgba(5,8,14,0.88) 100%)",
        }}
      />

      {/* 이동 유닛 — 칩+제목이 시트 라인 위에 붙어 한 몸으로 오르내린다 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          transform: shown ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragging
            ? "none"
            : "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onTransitionEnd={onSheetTransitionEnd}
      >
        <div className="px-edge pointer-events-none flex flex-col gap-2.5 pb-4.5">
          <PostChips post={post} />
          <p className="text-headline text-media-on leading-[1.32] font-extrabold tracking-[-0.4px] drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
            {post.title}
          </p>
        </div>

        {/* 시트 본체 */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="기사 세부"
          className="bg-bg rounded-t-sheet flex h-[73dvh] flex-col overflow-hidden"
        >
          {/* 그랩 존(기자 줄) — 잡고 끌어내리면 닫힌다 */}
          <div className="relative shrink-0">
            <div
              className="px-edge touch-none pt-5.5 select-none"
              onPointerDown={onGrabPointerDown}
              onPointerMove={onGrabPointerMove}
              onPointerUp={onGrabPointerEnd}
              onPointerCancel={onGrabPointerEnd}
            >
              <div className="flex items-center gap-2 pr-11">
                <span className="border-accent text-accent rounded-badge text-micro flex size-5 shrink-0 items-center justify-center border font-black">
                  T{post.reporter.tier}
                </span>
                <span className="text-body text-text font-bold">
                  {post.reporter.name}
                </span>
                <span className="text-label text-text-3">
                  · {post.timeLabel} · 조회 {formatCount(post.views)}
                </span>
              </div>
            </div>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setShown(false)}
              className="bg-elevate text-icon rounded-pill absolute top-3 right-3 flex size-8.5 items-center justify-center active:opacity-60"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* 본문·해시태그·댓글 스크롤 영역 */}
          <div className="no-scrollbar px-edge flex flex-1 flex-col gap-3.75 overflow-y-auto overscroll-contain pt-3.75 pb-6">
            <p className="text-body-lg text-text-2 leading-body-lg tracking-[-0.1px]">
              {post.summary}
            </p>

            <div className="flex items-center gap-2">
              {post.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-elevate text-label text-text-3 rounded-pill px-3 py-1.5 font-semibold"
                >
                  #{tag}
                </span>
              ))}
              <button
                type="button"
                className="text-accent text-label ml-auto flex items-center gap-1.25 font-bold active:opacity-60"
              >
                <LinkOutIcon size={13} />
                출처 원문 보기
              </button>
            </div>

            <div className="border-border flex items-baseline gap-1.25 border-t pt-3.5">
              <span className="text-body-lg font-extrabold">댓글</span>
              <span className="text-label text-text-3 font-semibold">
                {formatCount(post.commentCount)}
              </span>
            </div>

            {(post.comments ?? []).map((comment) => (
              <CommentThread key={comment.id} comment={comment} />
            ))}
          </div>

          {/* 댓글 입력바 — 홈 인디케이터/제스처 영역을 피해 pb에 safe-area를 더한다 */}
          <div
            className="border-border bg-nav flex shrink-0 items-center gap-2.5 border-t px-4 pt-3.25"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 13px)",
            }}
          >
            <input
              type="text"
              placeholder="팬 반응 남기기…"
              className="border-border bg-elevate-2 text-body text-text placeholder:text-text-4 rounded-hero h-11.5 min-w-0 flex-1 border px-4.75"
            />
            <button
              type="button"
              aria-label="댓글 보내기"
              className="bg-accent text-on-accent rounded-pill flex size-11 shrink-0 items-center justify-center active:opacity-60"
            >
              <SendMiniIcon size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 댓글 한 스레드 — 원 댓글 + (있으면) 들여쓴 답글들. */
function CommentThread({ comment }: { comment: Comment }) {
  return (
    <div className="flex flex-col gap-3.75">
      <CommentItem comment={comment} />
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} reply />
      ))}
    </div>
  );
}

/**
 * 댓글 한 줄 (아바타 + 작성자/시간 + 본문 + 좋아요·답글).
 *
 * @param reply - 답글이면 들여쓰기 + 작은 아바타로 렌더
 */
function CommentItem({
  comment,
  reply,
}: {
  comment: Comment;
  reply?: boolean;
}) {
  const initials = comment.author.replace("@", "").slice(0, 2).toUpperCase();
  return (
    <div className={`flex gap-2.5 ${reply ? "pl-10" : ""}`}>
      <span
        className={`bg-avatar text-icon rounded-pill text-micro flex shrink-0 items-center justify-center font-extrabold ${
          reply ? "size-6.5" : "size-8"
        }`}
      >
        {initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.25">
        <div className="flex items-baseline gap-2">
          <span className="text-label text-text font-bold">
            {comment.author}
          </span>
          <span className="text-caption text-text-4">{comment.timeLabel}</span>
        </div>
        <p className="text-body text-text-2 leading-body">{comment.body}</p>
        <div className="flex items-center gap-4 pt-0.5">
          <button
            type="button"
            className="text-text-4 flex items-center gap-1.25 active:opacity-60"
          >
            <HeartMiniIcon size={13} filled={comment.liked} />
            <span className="text-caption font-semibold">
              {formatCount(comment.likeCount)}
            </span>
          </button>
          <button
            type="button"
            className="text-caption text-text-4 font-semibold active:opacity-60"
          >
            답글
          </button>
        </div>
      </div>
    </div>
  );
}
