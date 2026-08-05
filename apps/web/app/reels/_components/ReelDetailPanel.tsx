"use client";

import { useEffect, useState } from "react";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import { CloseIcon } from "@plick/ui/icons";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { SourceLinkButton } from "@plick/ui/SourceLinkButton";
import { TagChips } from "@plick/ui/TagChips";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentList } from "@/_components/CommentList";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { useArticleReporters } from "@/_hooks/useArticleReporters";

/**
 * 릴 세부 패널 (KAN-219, 피그마 W2 기사 세부 219-2, API 연결 KAN-323).
 *
 * 릴에서 제목 영역이나 댓글 버튼을 누르면 오른쪽에서 미끄러져 들어온다.
 * 기자 줄·본문·해시태그·댓글·입력바를 담는다 — 모바일 `ReelDetailSheet`의
 * 데스크톱 대응(아래→위 대신 오른쪽→왼쪽).
 *
 * 데스크톱(lg↑)은 릴 뷰어 옆 인라인 카드로 서고, 모바일 뷰에선 전체 화면 오버레이로
 * 뜬다(좁은 폭에서 릴과 나란히 둘 수 없어 릴 위를 덮는다).
 *
 * 개폐 애니메이션: 패널을 항상 마운트해 두고 `open` 클래스만 토글하므로 열 때·닫을 때
 * 모두 transition이 탄다(마운트 타이밍 레이스가 없다). 데스크톱은 폭(0↔29.5rem)을
 * 애니메이트해 flex 형제인 릴 뷰어가 프레임마다 폭을 나눠 갖고 릴이 함께 부드럽게 밀린다.
 * 모바일 오버레이는 `translateX`(100%↔0)로 미끄러진다. 고정폭 안쪽 카드는 폭 애니 중
 * 리플로우 없이 `overflow-hidden`으로 드러난다.
 *
 * 실계약(KAN-323)으로 갈아타면서 기자가 없을 수 있게 됐고(그때는 시각·조회만 한 줄로
 * 남는다), 출처 버튼은 링크가 있을 때만 실제 원문으로 나간다.
 *
 * 댓글(KAN-329): 릴 카드 id가 곧 BE `articleSummaryId`라 기사와 같은 댓글 API를
 * 쓴다. 패널은 클라에서 열리므로 서버 씨앗 없이 열릴 때 목록을 받는다. 헤더
 * 카운트는 피드가 준 스냅샷(`reel.commentCount`)에 이 패널에서 단 수를 로컬로
 * 더한다 — 스냅샷은 방금 단 댓글을 모른다.
 *
 * 기자 줄(KAN-365): 피드는 대표 한 명만 주지만 기사엔 기자가 여럿일 수 있다.
 * 패널이 열리면 기사 상세를 받아({@link useArticleReporters}) 이름 옆 기자 수와
 * 기자 목록(표시 전용)을 붙이고, "출처 원문 보기"는 기자별 원문 링크 팝오버가
 * 된다. 받기 전엔 대표 이름만 서고 원문 버튼은 피드의 대표 링크로 직행한다.
 *
 * @param reel - 세부를 보여줄 릴. `null`이면 닫힘(마지막 릴은 닫힘 애니 동안 유지).
 * @param onClose - 닫기 요청 콜백(패널 소유자가 `reel`을 `null`로 만든다)
 */
export function ReelDetailPanel({
  reel,
  onClose,
}: {
  reel: ReelCard | null;
  onClose: () => void;
}) {
  const open = reel != null;
  /** 닫힘 애니메이션 동안에도 내용이 보이도록 마지막 릴을 유지한다. */
  const [rendered, setRendered] = useState<ReelCard | null>(reel);
  /** 이 패널에서 등록한 댓글 수 — 피드가 준 카운트 스냅샷에 더해 보여준다. */
  const [addedComments, setAddedComments] = useState(0);
  const reelId = reel?.id;
  /* 닫힘 애니 중에도 rendered가 남으니 그 기준으로 받는다 — 캐시가 있어 재요청 없음 */
  const reporters = useArticleReporters(rendered?.id);

  useEffect(() => {
    if (reel) setRendered(reel);
  }, [reel]);

  /* 다른 릴로 갈아타면 앞 릴에서 센 수는 의미가 없다 */
  useEffect(() => {
    if (reelId) setAddedComments(0);
  }, [reelId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const meta = rendered
    ? `${formatRelativeTime(rendered.publishedAt)} · 조회 ${formatCount(rendered.views)}`
    : "";

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
            {/* 헤더 — 기자 줄(없으면 시각·조회만) + 닫기 */}
            <div className="border-border flex items-center gap-2 border-b px-5 py-4">
              {rendered.reporter ? (
                <ReporterLine
                  reporter={rendered.reporter}
                  reporters={reporters}
                  meta={`· ${meta}`}
                  metaClassName="min-w-0 truncate"
                  className="min-w-0 flex-1"
                />
              ) : (
                <span
                  suppressHydrationWarning
                  className="text-label text-text-3 min-w-0 flex-1 truncate"
                >
                  {meta}
                </span>
              )}
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="bg-elevate text-icon hover:bg-elevate-2 focus-visible:outline-accent flex size-8.5 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
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
                <TagChips tags={rendered.hashtags} />
                {/* 기자가 여럿이면 기자별 원문 링크 팝오버, 그 외엔 대표 원문 직행 (KAN-365) */}
                <SourceLinkButton
                  label="출처 원문 보기"
                  sourceUrl={rendered.sourceUrl}
                  reporters={reporters}
                  className="ml-auto"
                />
              </div>

              <CommentsHeader
                count={rendered.commentCount + addedComments}
                className="border-border border-t pt-3.5"
              />

              <CommentComposer
                articleId={rendered.id}
                onPosted={() => setAddedComments((n) => n + 1)}
              />

              <CommentList
                articleId={rendered.id}
                onPosted={() => setAddedComments((n) => n + 1)}
                onDeleted={() => setAddedComments((n) => n - 1)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
