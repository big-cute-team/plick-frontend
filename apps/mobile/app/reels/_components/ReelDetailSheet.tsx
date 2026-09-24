"use client";

import { useState } from "react";
import { CloseIcon } from "@plick/ui/icons";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import { ArticleSourceLink } from "@/_components/ArticleSourceLink";
import { CommentComposer } from "@/_components/CommentComposer";
import { EntityChips } from "@/_components/EntityChips";
import { CommentList, CommentListSkeleton } from "@/_components/CommentList";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { DebateVoteCard } from "@/_components/DebateVoteCard";
import {
  SHEET_DRAG_Y_VAR,
  SHEET_HEIGHT_RATIO,
  SHEET_TRANSITION,
} from "@/_constants/reels";
import type { ReelCard } from "@plick/domain/types";
import type { ReelDetailMotion } from "@/_types/reels";

/**
 * 릴 세부 바텀시트 (KAN-168, 시안 KAN-567 "릴 세부 시트").
 *
 * 높이 86%, 위 모서리 radius 26, 그랩 핸들(38x4). 위 줄은 기자(13/700)와
 * "시각, 조회 N"(11.5 회색)이고 오른쪽 위에 닫기 원(34px, bg-chip)이 있다. 그 밑
 * 스크롤 영역에 본문(14.5/1.74), 태그 칩과 "출처 원문 보기", 투표 카드, 댓글이 든다.
 * 댓글 입력줄은 기사 세부와 같게 댓글 헤더 바로 밑에 둔다(KAN-307) — 하단 고정
 * 바가 아니라 본문과 같이 스크롤된다. 릴의 팀·제목 블록은 이 컴포넌트가 그리지
 * 않는다 — 릴에 원래 있던 요소(ReelItem)가 같은 motion 상태로 시트 라인 위까지
 * 따라 올라온다.
 *
 * KAN-365의 기자 전원 노출(이름 옆 기자 수, 기자별 원문 팝오버)은 시안이 기자를
 * 대표 한 명만 표기하는 규칙이라 걷어 냈다. 피드가 준 대표 기자와 대표 원문
 * 링크만 쓰므로 기사 상세를 따로 받지 않는다.
 *
 * 닫기: 그랩 존 드래그 다운, X 버튼, 시트 위 배경 탭(KAN-525), 또는 본문이
 * 최상단일 때 본문 어디서든 아래로 드래그(KAN-358, 유튜브 쇼츠 방식) → 내려간 뒤
 * motion이 스스로 언마운트.
 *
 * 댓글(KAN-303): 릴 카드 id가 곧 BE `articleSummaryId`라 기사와 같은 댓글
 * API를 쓴다. 시트는 클라에서 열리므로 서버 씨앗 없이 열릴 때 목록을 받는다.
 * 헤더 카운트는 피드가 준 스냅샷(`reel.commentCount`)에 이 시트에서 단 수를
 * 로컬로 더한다 — 스냅샷은 방금 단 댓글을 모른다.
 *
 * @param reel - 세부를 보여줄 릴
 * @param motion - useReelDetailMotion()이 만든 개폐·드래그 상태 (ReelsFeed 소유)
 */
export function ReelDetailSheet({
  reel,
  motion,
}: {
  reel: ReelCard;
  motion: ReelDetailMotion;
}) {
  const [addedComments, setAddedComments] = useState(0);

  return (
    /* 시트 위쪽 빈 배경(릴이 비치는 자리)을 누르면 닫힌다 (KAN-525). 릴 화면
       전체가 시트를 여는 탭 타깃이 되면서 이 층이 그 탭을 받아 주지 않으면
       배경 탭이 릴로 새어 시트를 다시 여는 것처럼 보인다. 시트 본체 안의 탭은
       target이 본체라 여기까지 오지 않는다. 딤은 시안의 rgba(15,18,20,.32)다 */
    <div
      className="bg-dim absolute inset-0 z-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) motion.requestClose();
      }}
    >
      {/* 시트 본체 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="릴 세부"
        /* 드래그 변수 수신자 등록 — 변수는 상속이 꺼져 있어 이 요소에 직접 쓰인다 (KAN-430) */
        ref={motion.dragTargetRef}
        className="bg-bg rounded-t-sheet absolute inset-x-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          height: `${SHEET_HEIGHT_RATIO * 100}%`,
          /* 드래그 오프셋은 CSS 변수로 흐른다 (KAN-430) — 손가락을 따라가는
             동안 리렌더 없이 transform만 갱신된다 */
          transform: motion.shown
            ? `translateY(var(${SHEET_DRAG_Y_VAR}, 0px))`
            : "translateY(100%)",
          transition: motion.dragging ? "none" : SHEET_TRANSITION,
          /* 드래그 동안만 컴포지터 승격 — 상시 부착은 금지다. 조상 transform이
             sticky를 깨는 실측(ScrollArea)이 있어 제스처 생명주기에만 묶는다 */
          willChange: motion.dragging ? "transform" : undefined,
        }}
        onTransitionEnd={motion.onTransitionEnd}
      >
        {/* 그랩 존(핸들 + 기자 줄) — 잡고 끌어내리면 닫힌다.
            기자가 없는 기사도 있어 그때는 시각·조회수만 같은 자리에 남긴다 */}
        <div className="relative shrink-0">
          <div
            className="touch-none px-4.5 pt-3 select-none"
            {...motion.grabProps}
          >
            <div
              aria-hidden
              className="bg-border-strong rounded-pill mx-auto mb-3.5 h-1 w-9.5"
            />
            <div className="flex items-baseline gap-1.75 pr-11.5">
              {reel.reporter && (
                <span className="text-body text-text-strong font-bold">
                  {reel.reporter.name}
                </span>
              )}
              <span className="text-caption-lg text-text-4">
                <span suppressHydrationWarning>
                  {formatRelativeTime(reel.publishedAt)}
                </span>
                , 조회 {formatCount(reel.views)}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={motion.requestClose}
            className="bg-chip text-text-3 rounded-pill absolute top-3.5 right-3.5 flex size-8.5 items-center justify-center active:opacity-60"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* 본문·태그·댓글 스크롤 영역 — 최상단에서 아래로 끌면 시트 드래그로 이어진다 */}
        <div
          ref={motion.scrollGrabRef}
          className="no-scrollbar flex flex-1 flex-col overflow-y-auto overscroll-contain px-4.5 pt-3.5 pb-6.5"
        >
          <p className="text-hero-sm text-text tracking-snug leading-[1.74]">
            {reel.summary}
          </p>

          {/* 팀 칩·인물 칩은 각자 프로필로 간다 (KAN-500). 칩이 늘어 한 줄을
              넘기면 접는다 — 원문 링크는 마지막 줄 오른쪽에 남는다. 누르면 원문
              클릭 이벤트가 나간다 (KAN-543) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-4">
            <EntityChips hashtags={reel.hashtags} figures={reel.figures} />
            <ArticleSourceLink
              articleId={reel.id}
              label="출처 원문 보기"
              sourceUrl={reel.sourceUrl}
              className="ml-auto"
            />
          </div>

          {/* 투표 카드 — 태그 행과 댓글 사이 (KAN-418). 마감(FINISH)
              릴도 피드 응답에 debate가 인라인이라(KAN-420) 별도 조회 없이
              기사 세부와 같이 contentType으로 마감을 판정한다. 마감이면 투표한
              적 없어도 결과가 바로 보이고 상호작용은 없다. key는 릴을 갈아탈 때
              카드 상태를 새로 시작하는 보험이다 */}
          {reel.debate && (
            <div className="pt-4.5">
              <DebateVoteCard
                key={reel.id}
                debate={reel.debate}
                closed={reel.contentType === "FINISH"}
              />
            </div>
          )}

          <CommentsHeader
            count={reel.commentCount + addedComments}
            className="border-border-soft mt-1.5 border-t pt-5 pb-2.5"
          />

          <CommentComposer
            articleId={reel.id}
            onPosted={() => setAddedComments((n) => n + 1)}
            className="pb-1"
          />

          {/* 씨앗 없이 클라에서 받으므로 로딩·에러 모두 이 경계가 받는다 (KAN-447) */}
          <QueryBoundary
            name="ReelComments"
            fallback={<CommentListSkeleton />}
            errorMessage="댓글을 불러오지 못했어요"
          >
            <CommentList
              articleId={reel.id}
              onPosted={() => setAddedComments((n) => n + 1)}
              onDeleted={() => setAddedComments((n) => n - 1)}
            />
          </QueryBoundary>
        </div>
      </div>
    </div>
  );
}
