"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { rememberFeedRank } from "@plick/core/article-views";

/**
 * 기사 세부로 가는 링크 (KAN-543). 피드·핫이슈처럼 순위가 있는 목록에서 쓰면 누른 순간
 * 순위를 기억해 두고, 기사 화면의 조회 기록이 `?rank=`로 싣는다(`useArticleView`).
 *
 * `next/link`를 그대로 감싼 얇은 클라 경계다. 목록 행(`NewsItem` 등)은 서버 컴포넌트라
 * 클릭 핸들러를 못 다는데, 행 전체를 클라로 내리면 목록 전부가 번들에 실린다. href는
 * 그대로라 크롤러가 따라가는 데는 차이가 없다.
 *
 * @param articleId 기사 id
 * @param rank 목록 안 순위(0부터). 순위가 없는 자리(관련 기사 등)는 생략
 */
export function ArticleLink({
  articleId,
  rank,
  ...props
}: {
  articleId: string;
  rank?: number;
} & Omit<ComponentProps<typeof Link>, "href" | "onClick">) {
  return (
    <Link
      href={`/articles/${articleId}`}
      onClick={
        rank === undefined ? undefined : () => rememberFeedRank(articleId, rank)
      }
      {...props}
    />
  );
}
