"use client";

import { useEffect, useRef, useState } from "react";
import { CARD_W, GAP, HOT_AUTOPLAY_MS } from "@/_constants/home";
import type { HotArticle } from "@/_types/articles";
import { HotHeroCard } from "./HotHeroCard";

/**
 * 핫이슈 센터 스냅 캐러셀 + 하단 점 인디케이터 + 자동 넘김 (KAN-282).
 *
 * 카드 폭 86%, 좌우 스페이서(7% − gap)로 첫/마지막 카드까지 정확히 화면 중앙에
 * 스냅시킨다. 좌우 패딩 방식은 카드 %가 '패딩 뺀 영역' 기준이라 끝단이 중앙까지
 * 못 가는 문제가 있다 (ADR 0002 §6-2).
 *
 * 자동 넘김은 일정 간격으로 다음 카드에 스크롤하고 마지막에서는 처음으로
 * 되감는다. 손가락이 닿아 있는 동안과 탭이 백그라운드일 때는 쉰다.
 *
 * @param articles BE가 주는 핫이슈 N건 — 건수가 유동이라 카드·점 개수가 따라간다
 */
export function HotCarousel({ articles }: { articles: HotArticle[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  /** setInterval 콜백이 스테일 클로저 없이 현재 인덱스를 읽는 통로 */
  const activeRef = useRef(0);
  /** 손가락이 트랙에 닿아 있는 동안 자동 넘김이 스크롤을 뺏지 않게 멈춘다 */
  const pausedRef = useRef(false);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const step = el.clientWidth * CARD_W + GAP;
    const i = Math.round(el.scrollLeft / step);
    const next = Math.max(0, Math.min(articles.length - 1, i));
    activeRef.current = next;
    setActive(next);
  }

  useEffect(() => {
    if (articles.length < 2) return;

    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || pausedRef.current || document.hidden) return;
      const step = el.clientWidth * CARD_W + GAP;
      // 마지막 카드 다음은 처음으로 — 티켓이 요구한 되감기 효과
      const next = (activeRef.current + 1) % articles.length;
      el.scrollTo({ left: next * step, behavior: "smooth" });
    }, HOT_AUTOPLAY_MS);

    return () => clearInterval(id);
  }, [articles.length]);

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
        onPointerDown={() => (pausedRef.current = true)}
        onPointerUp={() => (pausedRef.current = false)}
        className="snap-x-carousel no-scrollbar flex gap-2.5 overflow-x-auto pb-2"
      >
        <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
        {articles.map((article) => (
          <div
            key={article.id}
            className="aspect-[181/131] w-[86%] shrink-0 snap-center"
          >
            <HotHeroCard article={article} />
          </div>
        ))}
        <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
      </div>
      <div className="flex items-center justify-center gap-1 pt-1">
        {articles.map((article, i) => (
          <span
            key={article.id}
            className={
              i === active
                ? "bg-accent rounded-pill h-1 w-3"
                : "bg-text-4/40 rounded-pill size-1"
            }
          />
        ))}
      </div>
    </div>
  );
}
