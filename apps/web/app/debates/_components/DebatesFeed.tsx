"use client";

import Link from "next/link";
import { isDebateClosed } from "@plick/domain/format";
import type { DebateListItem, InitialDebateList } from "@plick/domain/types";
import { DebateVoteCard } from "@/_components/DebateVoteCard";
import { useDebates } from "@/_hooks/useDebates";

/** 투표 탭. 진행 중은 열린 토론, 마감은 contentType FINISH이거나 마감 시각이 지난 토론. */
export type DebateTab = "open" | "closed";

/** 첫 로딩에 보여줄 자리 개수. 카드가 커서 기사 리스트보다 적게 둔다. */
const SKELETON_COUNT = 3;

/**
 * 투표 목록 본체 (KAN-418 → KAN-567 시안 투표 1078-1165행). 진행 중 항목은 투표 카드
 * md(각진, 바로 투표 가능)와 아래 오른쪽 "기사 보기" 링크, 마감 항목은 카드 sm(마감
 * 상태)이다. 시안의 팀 엠블럼, 출처 기자, 댓글 수, 여론 적중, 실제 결과는 리스트
 * 응답에 없어 뺐다(응답은 질문, 선택지, 표 수, 기사 id뿐).
 *
 * 마감 토론도 리스트에 함께 온다. contentType(FINISH) 마감은 기사 상세와 같은
 * 규약으로 `closed`로 넘기고, closesAt 경과 마감(KAN-436)도 마감 탭으로 보낸다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 리스트 씨앗. 없으면 클라가 직접 받는다
 * @param tab 지금 탭
 */
export function DebatesFeed({
  initial,
  tab,
}: {
  initial?: InitialDebateList;
  tab: DebateTab;
}) {
  const { data, isPending, isError, isFetching, refetch } = useDebates(initial);
  const debates = (data ?? []).filter(
    (debate) => (tab === "closed") === isClosed(debate),
  );

  if (isPending) {
    return (
      <div>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <DebateCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-baseline gap-3 py-10">
        <p className="text-body-md text-text-4">투표를 불러오지 못했어요</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-label-lg text-accent hover:text-accent-hover focus-visible:outline-accent font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (debates.length === 0) {
    return (
      <p className="text-body-md text-text-4 py-10">
        {tab === "closed"
          ? "아직 마감된 투표가 없어요"
          : "진행 중인 투표가 없어요"}
      </p>
    );
  }

  return (
    <ul>
      {debates.map((debate) => (
        <li
          key={debate.id}
          className={`border-border-soft border-b ${tab === "closed" ? "py-4.5" : "pt-5 pb-5.5"}`}
        >
          <DebateVoteCard
            debate={debate}
            closed={debate.contentType === "FINISH"}
            size={tab === "closed" ? "sm" : "md"}
          />
          <div className="flex justify-end pt-2.5">
            <Link
              href={`/articles/${debate.articleId}`}
              className="text-label text-accent hover:text-accent-hover font-bold"
            >
              기사 보기
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** 마감 판정 — 기사 상태(FINISH)가 실기준이고, 마감 시각이 지난 것도 마감으로 본다. */
function isClosed(debate: DebateListItem): boolean {
  return debate.contentType === "FINISH" || isDebateClosed(debate.closesAt);
}

/** 투표 카드 자리 스켈레톤 — 배지, 질문, 트랙 2개의 실루엣이다. */
function DebateCardSkeleton() {
  return (
    <div className="border-border-soft border-b pt-5 pb-5.5">
      <div className="bg-vote-card flex animate-pulse flex-col gap-3 p-4">
        <div className="bg-vote-track h-5 w-14" />
        <div className="bg-vote-track h-6 w-3/4" />
        <div className="bg-vote-track h-9" />
        <div className="bg-vote-track h-9" />
      </div>
    </div>
  );
}
