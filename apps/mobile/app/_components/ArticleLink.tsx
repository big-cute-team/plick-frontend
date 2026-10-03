"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { EntryPoint } from "@plick/core/analytics";
import { rememberArticleOrigin } from "@plick/core/article-views";

/**
 * 기사 세부로 가는 링크 (KAN-543, KAN-584). 기사로 가는 링크는 전부 이걸 쓴다.
 *
 * 순위가 있는 목록(피드, 핫이슈)에서 쓰면 누른 순간 순위와 진입 화면을 기억해 두고, 기사 화면의
 * 조회 기록이 `?rank=`와 `X-Plick-Entry`로 싣는다(`useArticleView`). 진입 화면은 일회용 쿠키로도
 * 넘겨 뒤따르는 페이지 요청의 서버 렌더(상세 호출)까지 같은 값이 닿는다(`proxy.ts`).
 *
 * prefetch를 끈다 (KAN-584). 기사 세그먼트에 `loading.tsx`가 있어 Next가 뷰포트에 든 링크마다
 * 기사 페이지를 서버에서 미리 그리고, 그때 상세 API가 불려 서버가 열람(`article_opened`)으로
 * 센다. 피드와 관련 기사 다섯 개가 한꺼번에 미리 불려 한 기기가 1초 안에 기사 열 개를 연
 * 것처럼 찍혔다. 끄면 누른 뒤에 받지만 `loading.tsx`의 뼈대가 먼저 스트리밍돼 체감은 같다.
 *
 * `next/link`를 그대로 감싼 얇은 클라 경계다. 목록 행(`NewsItem` 등)은 서버 컴포넌트라
 * 클릭 핸들러를 못 다는데, 행 전체를 클라로 내리면 목록 전부가 번들에 실린다. href는
 * 그대로라 크롤러가 따라가는 데는 차이가 없다.
 *
 * @param articleId 기사 id
 * @param rank 목록 안 순위(0부터). 순위가 없는 자리(관련 기사 등)는 생략
 * @param entry 이 링크가 놓인 화면(`home_feed`, `hot`). 진입 화면 값이 없는 자리는 생략
 */
export function ArticleLink({
  articleId,
  rank,
  entry,
  ...props
}: {
  articleId: string;
  rank?: number;
  entry?: EntryPoint;
} & Omit<ComponentProps<typeof Link>, "href" | "onClick" | "prefetch">) {
  const remembers = rank !== undefined || entry !== undefined;
  return (
    <Link
      href={`/articles/${articleId}`}
      prefetch={false}
      onClick={
        remembers
          ? () => rememberArticleOrigin(articleId, { rank, entry })
          : undefined
      }
      {...props}
    />
  );
}
