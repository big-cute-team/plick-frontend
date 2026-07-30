"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/** 카드 폭 (트랙 폭 대비 비율) — 트랙의 `w-[86%]`와 일치해야 한다 */
const CARD_W = 0.86;

/** 카드 사이 간격(px) — `gap-2.5`와 일치해야 한다 */
const GAP = 10;

/** 자동 넘김 간격(ms) — 제목 두 줄을 읽을 시간 (KAN-282) */
const AUTOPLAY_MS = 4000;

/**
 * 핫이슈 센터 스냅 캐러셀 + 하단 점 인디케이터 + 자동 넘김 (KAN-282).
 *
 * 모바일 홈 전용이던 것을 웹 홈이 두 번째 소비자가 되면서 `@plick/ui`로
 * 승격했다(KAN-338). 카드 렌더는 앱마다 달라(모바일 `HotHeroCard`, 웹 `HotCard`)
 * children으로 주입받는다 — render prop이 아니라 children인 이유는 서버 컴포넌트
 * 페이지가 함수를 클라이언트 경계 너머로 넘길 수 없어서다. 카드를 서버에서
 * 그려 엘리먼트로 넘기면 경계를 그대로 통과한다.
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
 * `snap-x-carousel`·`no-scrollbar` 클래스는 각 앱 `globals.css`에 정의돼 있어야
 * 한다 (Tailwind 유틸이 아닌 커스텀 클래스).
 *
 * @param children - 카드 목록. 각 카드는 래퍼(`w-[86%]` + 비율 박스)를 `h-full`로 채운다.
 * @param cardClassName - 카드 래퍼의 비율 클래스. 기본은 모바일 기하(`aspect-[181/131]`).
 *   웹은 데스크톱에서 `lg:aspect-video`로 낮춰 카드가 과하게 길어지는 것을 막는다.
 */
export function HotCarousel({
  children,
  cardClassName = "aspect-[181/131]",
}: {
  children: ReactNode;
  cardClassName?: string;
}) {
  const cards = Children.toArray(children);
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
    const next = Math.max(0, Math.min(cards.length - 1, i));
    activeRef.current = next;
    setActive(next);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el || cards.length < 2) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(advance, AUTOPLAY_MS);
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
      const next = (activeRef.current + 1) % cards.length;
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
  }, [cards.length]);

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="snap-x-carousel no-scrollbar flex gap-2.5 overflow-x-auto pb-2"
      >
        <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
        {cards.map((card, i) => (
          /* 목록이 재정렬되지 않는 정적 렌더라 인덱스 키로 충분하다 */
          <div
            key={i}
            className={`w-[86%] shrink-0 snap-center ${cardClassName}`}
          >
            {card}
          </div>
        ))}
        <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
      </div>
      <div className="flex items-center justify-center gap-1 pt-1">
        {cards.map((_, i) => (
          <span
            key={i}
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
