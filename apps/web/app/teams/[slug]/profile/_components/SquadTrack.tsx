"use client";

import { useEffect, useRef, useState } from "react";
import type { SquadPlayer } from "@plick/domain/live";
import { ChevronRightIcon } from "@plick/ui/icons";

/**
 * 선수단 한 포지션 줄 (KAN-574). 왼쪽 줄 머리(포지션), 가운데 가로 트랙(선수 칩),
 * 오른쪽 좌우 버튼이다. 데스크톱은 휠로 가로 스크롤이 어려워 버튼이 트랙 폭만큼
 * 민다. 버튼은 끝에 닿으면 꺼지고, 한 줄에 다 들면 둘 다 꺼진 채 남는다(핫이슈
 * `HotCarousel`과 같은 규칙).
 *
 * @param label 줄 머리 (포지션 이름)
 * @param players 이 포지션 선수들
 * @param onSelect 칩을 눌렀을 때. 시즌 스탯 다이얼로그를 연다
 */
export function SquadTrack({
  label,
  players,
  onSelect,
}: {
  label: string;
  players: SquadPlayer[];
  onSelect: (player: SquadPlayer) => void;
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

  /** 트랙 폭만큼 민다 */
  const slide = (direction: -1 | 1) => {
    const track = trackRef.current;
    track?.scrollBy({
      left: direction * track.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <section
      aria-label={label}
      className="border-border-soft flex items-center gap-3 border-b py-3"
    >
      <h3 className="text-label text-text-3 w-16 shrink-0 font-bold">
        {label}
        <span className="text-caption text-text-4 ml-1 font-medium">
          {players.length}
        </span>
      </h3>
      <ul
        ref={trackRef}
        className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
      >
        {players.map((p) => (
          <li key={p.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="border-border hover:border-accent hover:text-accent focus-visible:outline-accent text-text-strong flex h-9 items-center gap-1.5 border px-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
              <span className="text-caption text-text-4 font-bold">
                {p.number ?? "-"}
              </span>
              <span className="text-body font-bold whitespace-nowrap">
                {p.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex shrink-0">
        <button
          type="button"
          aria-label={`이전 ${label}`}
          disabled={edges.start}
          onClick={() => slide(-1)}
          className="border-border-table text-text-3 hover:text-accent hover:border-accent focus-visible:outline-accent grid size-7 rotate-180 place-items-center border transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon size={14} />
        </button>
        <button
          type="button"
          aria-label={`다음 ${label}`}
          disabled={edges.end}
          onClick={() => slide(1)}
          className="border-border-table text-text-3 hover:text-accent hover:border-accent focus-visible:outline-accent -ml-px grid size-7 place-items-center border transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>
    </section>
  );
}
