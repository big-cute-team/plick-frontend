"use client";

import { useEffect, useRef } from "react";
import { markReachedEnd } from "@plick/core/reading";

/**
 * 본문 끝 표식 (KAN-543). 화면에 들어오면 이 기사를 끝까지 내렸다고 읽기 세션에 표시한다.
 * 그리는 것은 높이 없는 빈 줄 하나다.
 *
 * 스크롤 컨테이너를 몰라도 되게 `IntersectionObserver`로 본다 — 모바일은 `ScrollArea`
 * 안, 웹은 문서 스크롤이라 컨테이너가 다르지만 뷰포트 교차만 보면 둘 다 같다. 한 번
 * 닿으면 관찰을 끝낸다.
 *
 * @param articleId 읽고 있는 기사 id
 */
export function ReadEndSentinel({ articleId }: { articleId: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      markReachedEnd(articleId);
      observer.disconnect();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [articleId]);

  return <span ref={ref} aria-hidden className="block h-px w-full" />;
}
