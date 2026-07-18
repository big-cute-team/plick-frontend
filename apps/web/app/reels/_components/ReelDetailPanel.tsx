"use client";

import { useEffect, useState } from "react";
import { formatCount } from "@plick/domain/format";
import type { FeedPost } from "@plick/domain/types";
import { CloseIcon, LinkOutIcon } from "@plick/ui/icons";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { TagChips } from "@plick/ui/TagChips";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { CommentThread } from "@/_components/CommentThread";

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
 * 개폐 애니메이션: 패널을 **항상 마운트**해 두고 `open` 클래스만 토글하므로 열 때·닫을 때
 * 모두 transition이 탄다(마운트 타이밍 레이스가 없다). 데스크톱은 **폭**(0↔29.5rem)을
 * 애니메이트해 flex 형제인 릴 뷰어가 프레임마다 폭을 나눠 갖고 릴이 함께 부드럽게 밀린다.
 * 모바일 오버레이는 `translateX`(100%↔0)로 미끄러진다. 고정폭 안쪽 카드는 폭 애니 중
 * 리플로우 없이 `overflow-hidden`으로 드러난다.
 *
 * @param post - 세부를 보여줄 게시물. `null`이면 닫힘(마지막 게시물은 닫힘 애니 동안 유지).
 * @param onClose - 닫기 요청 콜백(패널 소유자가 `post`를 `null`로 만든다)
 */
export function ReelDetailPanel({
  post,
  onClose,
}: {
  post: FeedPost | null;
  onClose: () => void;
}) {
  const open = post != null;
  /** 닫힘 애니메이션 동안에도 내용이 보이도록 마지막 게시물을 유지한다. */
  const [rendered, setRendered] = useState<FeedPost | null>(post);

  useEffect(() => {
    if (post) setRendered(post);
  }, [post]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 overflow-hidden transition-[width,transform] duration-300 ease-out lg:static lg:z-auto lg:h-full lg:shrink-0 ${
        open
          ? "translate-x-0 lg:w-[29.5rem]"
          : "pointer-events-none translate-x-full lg:w-0 lg:translate-x-0"
      }`}
    >
      <div className="lg:pr-gutter h-full w-full lg:w-[29.5rem] lg:py-10">
        {rendered && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="기사 세부"
            className="bg-bg border-border lg:rounded-card flex h-full w-full flex-col overflow-hidden lg:border"
          >
            {/* 헤더 — 기자 줄 + 닫기 */}
            <ReporterLine
              reporter={rendered.reporter}
              meta={`· ${rendered.timeLabel} · 조회 ${formatCount(rendered.views)}`}
              metaClassName="min-w-0 truncate"
              className="border-border border-b px-5 py-4"
            >
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="bg-elevate text-icon hover:bg-elevate-2 focus-visible:outline-accent ml-auto flex size-8.5 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <CloseIcon size={18} />
              </button>
            </ReporterLine>

            {/* 본문·해시태그·댓글 스크롤 영역 */}
            <div className="flex flex-1 flex-col gap-3.75 overflow-y-auto overscroll-contain px-5 py-5">
              <p className="text-body-lg text-text-2 leading-body-lg tracking-snug">
                {rendered.summary}
              </p>

              <div className="flex items-center gap-2">
                <TagChips tags={rendered.tags ?? []} />
                <button
                  type="button"
                  className="text-accent text-label hover:text-accent focus-visible:outline-accent ml-auto flex items-center gap-1.25 rounded font-bold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <LinkOutIcon size={13} />
                  출처 원문 보기
                </button>
              </div>

              <CommentsHeader
                count={rendered.commentCount}
                className="border-border border-t pt-3.5"
              />

              {(rendered.comments ?? []).map((comment) => (
                <CommentThread key={comment.id} comment={comment} />
              ))}
            </div>

            {/* 댓글 입력바 */}
            <div className="border-border bg-nav shrink-0 border-t px-4 py-3.5">
              <CommentComposer withAvatar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
