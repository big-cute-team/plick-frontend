"use client";

import { useEffect } from "react";
import { beginReading, scheduleEndReading } from "@plick/core/reading";

/**
 * 기사 화면에 머문 시간을 잰다 (KAN-543). 마운트에 세션을 열고 언마운트에 닫아
 * `read_finished`가 나가게 한다. 끝까지 내렸는지는 본문 끝의 `ReadEndSentinel`이 따로
 * 표시한다. 세션 자체는 `@plick/core/reading`이 트리 밖에서 든다.
 *
 * @param articleId 읽는 기사 id
 */
export function useArticleRead(articleId: string) {
  useEffect(() => {
    beginReading(articleId);
    return () => scheduleEndReading(articleId);
  }, [articleId]);
}
