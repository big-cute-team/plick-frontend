"use client";

import { Children, useState, type ReactNode, type UIEvent } from "react";

/**
 * 사진 없는 핫이슈 텍스트 카드를 한 장씩 가로로 넘기는 페이저 (KAN-515, 시안 KAN-567).
 *
 * 스냅 스크롤 트랙과 그 아래 점 인디케이터다. 점은 활성이 14px 알약, 나머지는 5px
 * 점이고 누르면 그 칸으로 스크롤한다. 시안의 유일한 전환 애니메이션 중 하나가 이
 * 점의 폭 변화다.
 */
export function HotTextPager({ children }: { children: ReactNode }) {
  const cards = Children.toArray(children);
  const [active, setActive] = useState(0);

  /**
   * 칸 폭이 트랙 폭과 같아 scrollLeft를 폭으로 나눈 반올림이 곧 현재 칸이다.
   *
   * @param e - 트랙 scroll 이벤트
   */
  function onScroll(e: UIEvent<HTMLUListElement>) {
    const el = e.currentTarget;
    if (el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function jump(e: UIEvent<HTMLButtonElement> | null, i: number) {
    const track = e?.currentTarget.closest("[data-pager]")?.querySelector("ul");
    track?.scrollTo({ left: track.clientWidth * i, behavior: "smooth" });
  }

  return (
    <div data-pager className="border-border-soft mx-3 border-t pt-3">
      <ul
        onScroll={onScroll}
        className="snap-x-carousel no-scrollbar flex items-stretch overflow-x-auto"
      >
        {cards.map((card, i) => (
          <li key={i} className="w-full shrink-0 snap-center">
            {card}
          </li>
        ))}
      </ul>
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2.75">
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번째 핫이슈`}
              aria-current={i === active ? "true" : undefined}
              onClick={(e) => jump(e, i)}
              className={`rounded-pill h-1.25 transition-[width,background-color] duration-200 ${
                i === active ? "bg-accent w-3.5" : "bg-border-strong w-1.25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
