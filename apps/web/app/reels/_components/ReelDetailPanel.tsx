"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  figurePath,
  formatCount,
  formatRelativeTime,
  hashtagHref,
} from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import { CloseIcon } from "@plick/ui/icons";
import { ArticleSourceLink } from "@/_components/ArticleSourceLink";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentList } from "@/_components/CommentList";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { DebateVoteCard } from "@/_components/DebateVoteCard";
import { useArticleReporters } from "@/_hooks/useArticleReporters";

/**
 * 릴 세부 패널 (KAN-219, API 연결 KAN-323, 시안 KAN-567 웹 릴스 473-571행).
 *
 * 데스크톱에선 처음부터 열려 있고(KAN-483), 닫은 뒤 카드나 레일의 댓글 버튼을
 * 누르면 오른쪽에서 다시 미끄러져 들어온다. 시안대로 392px 폭에 왼쪽 표 테두리
 * (`border-border-table`)를 두른 흰 면이고, 기자 줄, 본문, 투표 카드, 태그 줄,
 * 댓글, 입력바를 담는다. 모바일 `ReelDetailSheet`의 데스크톱 대응(아래→위 대신
 * 오른쪽→왼쪽)이다.
 *
 * 데스크톱(lg↑)은 릴 뷰어 옆 인라인으로 서고, 좁은 폭에선 전체 화면 오버레이로
 * 뜬다(좁은 폭에서 릴과 나란히 둘 수 없어 릴 위를 덮는다). 그래서 기본 열림은
 * 데스크톱에만 준다.
 *
 * `undecided`(사용자가 아직 열고 닫지 않음)일 때는 열림, 닫힘 클래스를 하나로 고르지
 * 않고 `lg:` 분기로 데스크톱 열림, 좁은 폭 닫힘을 CSS가 정한다. 서버는 창 폭을 모르니
 * 어느 폭에서도 맞는 HTML을 내려야 하이드레이션이 어긋나지 않는다. 소유자가 마운트
 * 뒤 실제 폭으로 확정하면 같은 화면을 그리는 보통 클래스로 넘어간다.
 *
 * 개폐 애니메이션: 패널을 항상 마운트해 두고 `open` 클래스만 토글하므로 열 때, 닫을 때
 * 모두 transition이 탄다(마운트 타이밍 레이스가 없다). 데스크톱은 폭(0↔392px)을
 * 애니메이트해 flex 형제인 릴 뷰어가 프레임마다 폭을 나눠 갖고 릴이 함께 부드럽게 밀린다.
 * 좁은 폭 오버레이는 `translateX`(100%↔0)로 미끄러진다. 고정폭 안쪽은 폭 애니 중
 * 리플로우 없이 `overflow-hidden`으로 드러난다.
 *
 * 실계약(KAN-323)으로 갈아타면서 기자가 없을 수 있게 됐고(그때는 시각, 조회만 한 줄로
 * 남는다), 출처 버튼은 링크가 있을 때만 실제 원문으로 나간다. 기자 등급과 "외 N명"은
 * 시안 규칙대로 지웠다. 대표 기자 한 명만 쓴다.
 *
 * 댓글(KAN-329): 릴 카드 id가 곧 BE `articleSummaryId`라 기사와 같은 댓글 API를
 * 쓴다. 패널은 클라에서 열리므로 서버 씨앗 없이 열릴 때 목록을 받는다. 헤더
 * 카운트는 피드가 준 스냅샷(`reel.commentCount`)에 이 패널에서 단 수를 로컬로
 * 더한다. 스냅샷은 방금 단 댓글을 모른다.
 *
 * 원문 링크(KAN-365): 기사엔 기자가 여럿일 수 있어 패널이 열리면 기사 상세를 받아
 * ({@link useArticleReporters}) "출처 원문 보기"를 기자별 원문 링크 팝오버로 만든다.
 * 받기 전엔 피드의 대표 링크로 직행한다.
 *
 * @param reel - 세부를 보여줄 릴. `null`이면 닫힘(마지막 릴은 닫힘 애니 동안 유지).
 * @param undecided - 사용자가 아직 열고 닫지 않은 초기 상태. 데스크톱은 열림, 좁은
 *   폭은 닫힘으로 CSS가 가른다. 소유자가 마운트 뒤 실제 폭으로 확정하면 꺼진다
 * @param onClose - 닫기 요청 콜백(패널 소유자가 `reel`을 `null`로 만든다)
 */
export function ReelDetailPanel({
  reel,
  undecided = false,
  onClose,
}: {
  reel: ReelCard | null;
  undecided?: boolean;
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

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 overflow-hidden transition-[width,transform] duration-300 ease-out lg:static lg:z-auto lg:h-full lg:shrink-0 ${
        !open
          ? "pointer-events-none translate-x-full lg:w-0 lg:translate-x-0"
          : undecided
            ? "pointer-events-none translate-x-full lg:pointer-events-auto lg:w-98 lg:translate-x-0"
            : "translate-x-0 lg:w-98"
      }`}
    >
      <div className="h-full w-full lg:w-98">
        {rendered && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="릴 세부"
            className="bg-bg border-border-table flex h-full w-full flex-col overflow-y-auto overscroll-contain lg:border-l"
          >
            {/* 머리 — 기자(없으면 시각, 조회만) + 닫기 30px 원. 기자 프로필은 아직 없어 글자로만 둔다 */}
            <div className="flex items-center gap-2.25 px-5.5 pt-5 pb-3.25">
              {rendered.reporter && (
                <span className="text-body text-text-strong shrink-0 font-bold">
                  {rendered.reporter.name}
                </span>
              )}
              <span
                suppressHydrationWarning
                className="text-label text-text-3 min-w-0 truncate"
              >
                {formatRelativeTime(rendered.publishedAt)}, 조회{" "}
                {formatCount(rendered.views)}
              </span>
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="bg-chip text-text-3 hover:bg-avatar hover:text-text-strong focus-visible:outline-accent ml-auto grid size-7.5 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            {/* 본문 14/1.72 */}
            <p className="text-body-md text-text tracking-snug px-5.5 pb-4.5 leading-[1.72]">
              {rendered.summary}
            </p>

            {/* 투표 카드 — 본문과 태그 줄 사이 (KAN-418, 시안 496-522행). 마감(FINISH) 릴도
                피드 응답에 debate가 인라인이라(KAN-420) 별도 조회 없이 contentType으로
                마감을 판정한다. 패널은 릴을 갈아타도 마운트가 유지되므로 key로 릴마다
                카드 상태를 새로 시작한다 */}
            {rendered.debate && (
              <div className="px-5.5 pb-4.5">
                <DebateVoteCard
                  key={rendered.id}
                  debate={rendered.debate}
                  closed={rendered.contentType === "FINISH"}
                />
              </div>
            )}

            {/* 태그 줄 — 인물, 팀 이름은 700이고 프로필로 간다. 오른쪽에 출처 원문 보기 */}
            <div className="flex flex-wrap items-center gap-1.75 px-5.5 pb-1">
              {rendered.figures.map((figure) => (
                <Link
                  key={`figure-${figure.id}`}
                  href={figurePath(figure.id)}
                  className="text-label text-text-3 hover:text-accent font-bold"
                >
                  {figure.name}
                </Link>
              ))}
              {rendered.hashtags.map((tag) => {
                const href = hashtagHref(tag);
                return href ? (
                  <Link
                    key={`tag-${tag}`}
                    href={href}
                    className="text-label text-text-3 hover:text-accent font-bold"
                  >
                    {tag}
                  </Link>
                ) : (
                  <span key={`tag-${tag}`} className="text-label text-text-3">
                    {tag}
                  </span>
                );
              })}
              {/* 기자가 여럿이면 기자별 원문 링크 팝오버, 그 외엔 대표 원문 직행 (KAN-365).
                  누르면 원문 클릭 이벤트가 나간다 (KAN-543) */}
              <ArticleSourceLink
                articleId={rendered.id}
                label="출처 원문 보기"
                sourceUrl={rendered.sourceUrl}
                reporters={reporters}
                className="ml-auto"
              />
            </div>

            {/* 댓글 */}
            <div className="flex flex-col px-5.5 pb-6">
              <CommentsHeader
                count={rendered.commentCount + addedComments}
                className="pt-5 pb-3"
              />
              <CommentComposer
                articleId={rendered.id}
                onPosted={() => setAddedComments((n) => n + 1)}
                className="pb-1"
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
