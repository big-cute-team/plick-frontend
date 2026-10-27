"use client";

import type { Debate } from "@plick/domain/types";
import { DebateVoteCard } from "@/_components/DebateVoteCard";
import { useArticleDebate } from "@/_hooks/useArticleDebate";

/**
 * 기사 상세의 투표 카드 (KAN-681). 서버 props를 씨앗으로 심은 쿼리
 * (`useArticleDebate`)가 집계의 원본이고, 카드는 그 값을 그린다. 모바일
 * `ArticleDebateCard`의 웹 이식이다. 전에는 `DebateVoteCard`가 서버 props를 state로
 * 복사해 들어 ISR 스냅샷의 옛 숫자가 화면에 그대로 남았다.
 *
 * @param articleId 기사 id
 * @param debate 서버가 내려준 토론 씨앗
 * @param closed 마감된 토론인가(기사 `contentType === "FINISH"`)
 */
export function ArticleDebateCard({
  articleId,
  debate: initial,
  closed,
}: {
  articleId: string;
  debate: Debate;
  closed: boolean;
}) {
  const { data: debate } = useArticleDebate(articleId, initial);
  if (!debate) return null;

  return (
    <div className="mt-6.5">
      <DebateVoteCard articleId={articleId} debate={debate} closed={closed} />
    </div>
  );
}
