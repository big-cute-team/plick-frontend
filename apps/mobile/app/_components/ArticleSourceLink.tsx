"use client";

import type { ComponentProps } from "react";
import { trackOutboundClicked } from "@plick/core/events";
import { SourceLinkButton } from "@plick/ui/SourceLinkButton";

/**
 * 원문 버튼에 원문 클릭 이벤트(`outbound_clicked`)를 붙인 것 (KAN-543). 기사 세부와
 * 릴 세부의 원문 자리가 함께 쓴다.
 *
 * `SourceLinkButton`은 분석을 모르는 순수 컴포넌트라 콜백만 받는데, 기사 본문
 * (`ArticleBody`)은 서버 컴포넌트라 함수를 prop으로 못 넘긴다. 그래서 어느 기사인지만
 * 받아 여기서 콜백을 만든다.
 *
 * @param articleId 원문이 속한 기사(릴) id
 */
export function ArticleSourceLink({
  articleId,
  ...props
}: { articleId: string } & Omit<
  ComponentProps<typeof SourceLinkButton>,
  "onOpen"
>) {
  return (
    <SourceLinkButton
      {...props}
      onOpen={(href) => trackOutboundClicked(articleId, href)}
    />
  );
}
