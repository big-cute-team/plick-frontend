"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRightIcon } from "@plick/ui/icons";

/**
 * 홈 핫이슈 한 줄 캐러셀 (KAN-569). `sm`부터 카드 세 장이 한 화면이고, 제목 줄
 * 오른쪽 좌우 버튼이 한 화면(세 장)씩 넘긴다. 좁은 화면은 한 장 반이 보여 손으로
 * 민다. 트랙은 가로 스냅이다.
 *
 * KAN-567 시안의 3열 grid는 카드가 네 장 이상이면 두 줄로 접혔다. 한 줄을 지키려고
 * 가로 트랙으로 바꿨다. 버튼은 끝에 닿으면 꺼진다.
 *
 * @param title 제목 줄 왼쪽에 설 섹션 제목
 * @param children 카드들. 하나씩 트랙 칸에 담긴다
 */
export function HotCarousel({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  /* 스크롤 끝 판정. 소수점 스크롤 폭 반올림으로 1px 모자라는 경우를 봐준다 */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () =>
      setEdges({
        start: track.scrollLeft <= 1,
        end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
      });
    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  /** 한 화면 폭만큼 민다. 스냅이 카드 경계에 맞춰 준다 */
  const slide = (direction: -1 | 1) => {
    const track = trackRef.current;
    track?.scrollBy({
      left: direction * track.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="flex items-center pb-2.75">
        {title}
        <div aria-hidden className="flex-1" />
        <button
          type="button"
          aria-label="이전 핫이슈"
          disabled={edges.start}
          onClick={() => slide(-1)}
          className="border-border-table text-text-3 hover:text-accent hover:border-accent focus-visible:outline-accent grid size-7 rotate-180 place-items-center border transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon size={14} />
        </button>
        <button
          type="button"
          aria-label="다음 핫이슈"
          disabled={edges.end}
          onClick={() => slide(1)}
          className="border-border-table text-text-3 hover:text-accent hover:border-accent focus-visible:outline-accent -ml-px grid size-7 place-items-center border transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>
      <ul
        ref={trackRef}
        className="snap-x-carousel no-scrollbar flex gap-5 overflow-x-auto pb-7.5"
      >
        {Children.toArray(children).map((card, i) => (
          <li
            key={i}
            className="w-2/3 shrink-0 snap-start sm:w-[calc((100%-2.5rem)/3)]"
          >
            {card}
          </li>
        ))}
      </ul>
    </>
  );
}
