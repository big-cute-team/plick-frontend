"use client";

import { ArticleLink } from "@/_components/ArticleLink";
import { useSearchParams } from "next/navigation";
import { isDebateClosed } from "@plick/domain/format";
import type { DebateListItem, InitialDebateList } from "@plick/domain/types";
import { VoteCard } from "@plick/ui/VoteCard";
import { ChevronRightIcon } from "@plick/ui/icons";
import { DebateVoteCard } from "@/_components/DebateVoteCard";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { DEBATE_EMPTY_COPY } from "@/_constants/debates";
import { useDebates } from "@/_hooks/useDebates";
import { useMyArticleState } from "@/_hooks/useMyArticleState";
import { useViewState } from "@/_stores/view-state";
import type { DebateTab } from "@/_types/debates";
import { debateTabFrom, debateTabPath } from "@/_utils/debates";
import { DebateListSkeleton } from "./DebateListSkeleton";
import { DebateTabs } from "./DebateTabs";

/**
 * 투표 화면 본체 (KAN-418, KAN-567 리디자인). 탭 줄 + 탭별 투표 카드 리스트.
 *
 * 어느 탭을 보고 있는지는 URL `?tab=`이 정한다(MY 활동 탭과 같은 규약). 탭
 * 선택은 `history.replaceState`로 URL만 바꾼다. 서버 왕복도 리마운트도 없이
 * `useSearchParams`가 따라오고, 탭 선택이 히스토리에 쌓이지 않는다. 탭을 바꾸면
 * 맨 위로 올린다.
 *
 * 탭과 경계만 세우고 리스트는 {@link DebateList}가 그린다 (KAN-447). 씨앗 없이
 * 들어와 클라가 받는 동안은 Suspense fallback(스켈레톤)이, 실패는 경계의 에러
 * UI가 받는다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 리스트 씨앗. 없으면 클라가 직접 받는다.
 */
export function DebatesFeed({ initial }: { initial?: InitialDebateList }) {
  const searchParams = useSearchParams();
  const tab = debateTabFrom(searchParams.get("tab"));

  function handleChange(next: DebateTab) {
    if (next === tab) return;
    useViewState.getState().requestTop("debate");
    window.history.replaceState(null, "", debateTabPath(next));
  }

  return (
    <>
      <DebateTabs value={tab} onChange={handleChange} />
      <section className="px-edge">
        <QueryBoundary
          name="DebatesFeed"
          fallback={<DebateListSkeleton />}
          errorMessage="투표를 불러오지 못했어요"
        >
          <DebateList tab={tab} initial={initial} />
        </QueryBoundary>
      </section>
    </>
  );
}

/**
 * 리스트 본체. suspense 쿼리를 부르는 쪽이라 경계 안에 산다.
 *
 * `GET /debates`는 마감 토론까지 한 배열로 주므로 탭은 여기서 가른다. 마감 판정은
 * 기사 상세와 같은 두 겹이다. contentType(FINISH)과 closesAt 경과를 OR로 겹친다
 * (KAN-436). 진행 중 탭의 카드는 리스트에서 바로 투표된다(`DebateVoteCard`가
 * `useDebateVote`·`syncDebateVote` 규약으로 캐시까지 맞춘다). 마감 탭은 표시
 * 전용 카드고 누르면 기사로 간다.
 *
 * 시안의 팀 엠블럼·출처 기자·댓글 수·여론 적중·실제 결과는 리스트 응답에 없어
 * 그리지 않는다(API 공백). 기사로 가는 길은 카드 아래 "댓글" 링크로 남긴다.
 *
 * @param tab 지금 보는 탭
 * @param initial 서버 씨앗
 */
function DebateList({
  tab,
  initial,
}: {
  tab: DebateTab;
  initial?: InitialDebateList;
}) {
  const { data } = useDebates(initial);
  const items = data.filter(
    (debate) => isClosed(debate) === (tab === "closed"),
  );

  if (items.length === 0) {
    return (
      <p className="text-body text-text-4 py-12 text-center">
        {DEBATE_EMPTY_COPY[tab]}
      </p>
    );
  }

  return (
    <ul>
      {items.map((debate) => (
        <li key={debate.id} className="border-border-soft border-b pt-4 pb-4.5">
          {tab === "open" ? (
            <DebateVoteCard
              articleId={debate.articleId}
              debate={debate}
              size="md"
            />
          ) : (
            <ArticleLink
              articleId={debate.articleId}
              className="block active:opacity-70"
            >
              <ClosedVoteCard debate={debate} />
            </ArticleLink>
          )}
          <ArticleLink
            articleId={debate.articleId}
            className="text-caption-lg text-text-3 flex items-center justify-end gap-0.5 pt-2.5 active:opacity-60"
          >
            댓글
            <ChevronRightIcon size={12} />
          </ArticleLink>
        </li>
      ))}
    </ul>
  );
}

/** 마감 여부. 리스트 카드가 스스로 겹치는 판정과 같다 (KAN-436). */
function isClosed(debate: DebateListItem): boolean {
  return debate.contentType === "FINISH" || isDebateClosed(debate.closesAt);
}

/**
 * 마감 탭의 표시 전용 카드. 리스트는 익명 ISR이라 `myVote`가 늘 null이어서 내 표만
 * 내 상태 캐시에서 얹는다 (KAN-664).
 *
 * @param debate 리스트 항목
 */
function ClosedVoteCard({ debate }: { debate: DebateListItem }) {
  const { vote } = useMyArticleState(debate.articleId);
  return <VoteCard debate={{ ...debate, myVote: vote }} closed size="sm" />;
}
