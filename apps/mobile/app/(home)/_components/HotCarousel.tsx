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
 * 자동 넘김은 고정 인터벌이 아니라 리셋되는 타이머다. 손가락이 닿으면 멈추고,
 * 떼거나 스크롤이 일 때마다 처음부터 다시 센다 — 유저가 직접 보는 동안 타이머가
 * 스와이프를 뺏지 않고, 움직임이 멎은 시점부터 온전한 간격 뒤에 넘어간다.
 * 마지막 카드 다음은 처음으로 되감고, 백그라운드 탭에서는 쉰다.
 *
 * @param articles BE가 주는 핫이슈 N건 — 건수가 유동이라 카드·점 개수가 따라간다
 */
export function HotCarousel({ articles }: { articles: HotArticle[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  /** 타이머 콜백이 스테일 클로저 없이 현재 인덱스를 읽는 통로 */
  const activeRef = useRef(0);
  /** 손가락이 트랙에 닿아 있는 동안 true — 타이머를 걸지 않는다 */
  const holdingRef = useRef(false);

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
    const el = trackRef.current;
    if (!el || articles.length < 2) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(advance, HOT_AUTOPLAY_MS);
    }

    function advance() {
      // 잡고 있으면 넘기지 않는다 — 떼는 순간 release가 새로 건다
      if (holdingRef.current) return;
      // 백그라운드 탭에서는 자리만 지키다 다음 기회를 본다
      if (document.hidden) {
        schedule();
        return;
      }
      const step = el!.clientWidth * CARD_W + GAP;
      // 마지막 카드 다음은 처음으로 — 티켓이 요구한 되감기 효과
      const next = (activeRef.current + 1) % articles.length;
      el!.scrollTo({ left: next * step, behavior: "smooth" });
      schedule();
    }

    function hold() {
      holdingRef.current = true;
      if (timer) clearTimeout(timer);
    }

    function release() {
      holdingRef.current = false;
      schedule();
    }

    /**
     * 터치 스크롤이 시작되면 브라우저가 pointercancel을 쏴서 pointer 쌍만으로는
     * 손가락이 아직 닿아 있는데 release로 오인한다. 그래서 터치는 touch 이벤트로
     * 잡고 pointer 이벤트는 마우스 드래그에만 쓴다.
     */
    function pointerHold(e: PointerEvent) {
      if (e.pointerType === "mouse") hold();
    }
    function pointerRelease(e: PointerEvent) {
      if (e.pointerType === "mouse") release();
    }

    // 스와이프 관성이든 자동 넘김 애니메이션이든 스크롤이 이는 동안 타이머를
    // 계속 뒤로 민다 — 움직임이 멎은 시점부터 온전한 간격을 센다
    function onAnyScroll() {
      if (!holdingRef.current) schedule();
    }

    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("touchend", release);
    el.addEventListener("touchcancel", release);
    el.addEventListener("pointerdown", pointerHold);
    el.addEventListener("pointerup", pointerRelease);
    el.addEventListener("scroll", onAnyScroll, { passive: true });

    schedule();

    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchend", release);
      el.removeEventListener("touchcancel", release);
      el.removeEventListener("pointerdown", pointerHold);
      el.removeEventListener("pointerup", pointerRelease);
      el.removeEventListener("scroll", onAnyScroll);
    };
  }, [articles.length]);

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
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
