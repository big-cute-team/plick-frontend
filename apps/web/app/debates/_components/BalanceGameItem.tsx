"use client";

import type { DebateListItem } from "@plick/domain/types";
import { BalanceGameCard } from "@plick/ui/BalanceGameCard";
import { ArticleLink } from "@/_components/ArticleLink";
import { useHydrated } from "@/_hooks/useHydrated";
import { useMyArticleState } from "@/_hooks/useMyArticleState";

/** 카드 전체가 게시물 링크다. 목록에서는 투표를 실행하지 않는다. */
export function BalanceGameItem({
  debate,
  closed,
}: {
  debate: DebateListItem;
  closed: boolean;
}) {
  const hydrated = useHydrated();
  const { vote } = useMyArticleState(debate.articleId);
  return (
    <ArticleLink
      articleId={debate.articleId}
      aria-label={`${debate.topic} 게시물 보기`}
      className="focus-visible:outline-accent rounded-card block h-full w-full transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-70 motion-reduce:transform-none"
    >
      <BalanceGameCard
        debate={debate}
        myVote={hydrated ? vote : null}
        closed={closed}
      />
    </ArticleLink>
  );
}
