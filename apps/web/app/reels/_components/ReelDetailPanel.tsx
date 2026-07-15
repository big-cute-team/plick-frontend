"use client";

import { useEffect, useState } from "react";
import { formatCount } from "@/_lib/format";
import type { FeedPost } from "@/_lib/types";
import {
  CloseIcon,
  LinkOutIcon,
  SendMiniIcon,
  UserRoundIcon,
} from "@plick/ui/icons";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import { CommentThread } from "./CommentThread";

/**
 * 릴 세부 패널 (KAN-219, 피그마 W2 기사 세부 219-2).
 *
 * 릴에서 제목 영역이나 댓글 버튼을 누르면 오른쪽에서 미끄러져 들어온다.
 * 기자 줄·본문·해시태그·댓글·입력바를 담는다 — 모바일 `ReelDetailSheet`의
 * 데스크톱 대응(아래→위 대신 오른쪽→왼쪽).
 *
 * 데스크톱(lg↑)은 릴 뷰어 옆 인라인 카드로 서고, 모바일 뷰에선 전체 화면 오버레이로
 * 뜬다(좁은 폭에서 릴과 나란히 둘 수 없어 릴 위를 덮는다).
 *
 * @param post - 세부를 보여줄 게시물. `null`이면 닫힘(퇴장 애니메이션 후 언마운트).
 * @param onClose - 닫기 요청 콜백(패널 소유자가 `post`를 `null`로 만든다)
 */
export function ReelDetailPanel({
  post,
  onClose,
}: {
  post: FeedPost | null;
  onClose: () => void;
}) {
  /** 퇴장 애니메이션 동안 마지막 게시물을 유지한다(닫힌 뒤 언마운트). */
  const [rendered, setRendered] = useState<FeedPost | null>(post);
  /** 미끄러져 들어온 상태인가 — false→true가 슬라이드 인. */
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (post) {
      setRendered(post);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [post, onClose]);

  if (!rendered) return null;

  return (
    <div
      className="lg:pr-gutter fixed inset-0 z-50 transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[27.5rem] lg:shrink-0 lg:py-10"
      style={{ transform: shown ? "translateX(0)" : "translateX(100%)" }}
      onTransitionEnd={() => {
        if (!shown) setRendered(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="기사 세부"
        className="bg-bg border-border lg:rounded-card flex h-full flex-col overflow-hidden lg:border"
      >
        {/* 헤더 — 기자 줄 + 닫기 */}
        <div className="border-border flex items-center gap-2 border-b px-5 py-4">
          <ReporterTierBadge reporter={rendered.reporter} />
          <span className="text-body text-text font-bold">
            {rendered.reporter.name}
          </span>
          <span className="text-label text-text-3 min-w-0 truncate">
            · {rendered.timeLabel} · 조회 {formatCount(rendered.views)}
          </span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="bg-elevate text-icon hover:bg-elevate-2 focus-visible:outline-accent ml-auto flex size-8.5 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* 본문·해시태그·댓글 스크롤 영역 */}
        <div className="flex flex-1 flex-col gap-3.75 overflow-y-auto overscroll-contain px-5 py-5">
          <p className="text-body-lg text-text-2 leading-body-lg tracking-snug">
            {rendered.summary}
          </p>

          <div className="flex items-center gap-2">
            {rendered.tags?.map((tag) => (
              <span
                key={tag}
                className="bg-elevate text-label text-text-3 rounded-pill px-3 py-1.5 font-semibold"
              >
                #{tag}
              </span>
            ))}
            <button
              type="button"
              className="text-accent text-label hover:text-accent focus-visible:outline-accent ml-auto flex items-center gap-1.25 rounded font-bold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <LinkOutIcon size={13} />
              출처 원문 보기
            </button>
          </div>

          <div className="border-border flex items-baseline gap-1.25 border-t pt-3.5">
            <span className="text-body-lg font-extrabold">댓글</span>
            <span className="text-label text-text-3 font-semibold">
              {formatCount(rendered.commentCount)}
            </span>
          </div>

          {(rendered.comments ?? []).map((comment) => (
            <CommentThread key={comment.id} comment={comment} />
          ))}
        </div>

        {/* 댓글 입력바 */}
        <div className="border-border bg-nav flex shrink-0 items-center gap-2.5 border-t px-4 py-3.5">
          <span className="bg-avatar text-icon grid size-8.5 shrink-0 place-items-center rounded-full">
            <UserRoundIcon size={18} />
          </span>
          <input
            type="text"
            placeholder="팬 반응 남기기…"
            className="border-border bg-elevate-2 text-body text-text placeholder:text-text-4 focus-visible:border-border-strong rounded-pill h-10 min-w-0 flex-1 border px-4 outline-none"
          />
          <button
            type="button"
            aria-label="댓글 보내기"
            className="bg-accent text-on-accent focus-visible:outline-accent flex size-10 shrink-0 items-center justify-center rounded-full hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <SendMiniIcon size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
