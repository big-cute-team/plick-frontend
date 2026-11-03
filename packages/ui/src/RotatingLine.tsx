"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "./icons";

/**
 * 한 항목씩 아래로 넘긴다. 화면 밖·탭 숨김·움직임 줄이기 설정에서는 자동 전환을
 * 멈추고, 마우스를 올리거나 안쪽 링크에 포커스가 있는 동안도 멈춰 누르려던 항목이
 * 달아나지 않게 한다. 사용자가 직접 멈추는 버튼은 두지 않는다 (KAN-707). 오른쪽
 * 끝의 `N/M`은 다음 항목으로 넘기는 버튼이다.
 *
 * 펼치기(KAN-709)는 호출부가 든다. `onToggle`을 넘기면 `N/M` 오른쪽에 화살표 버튼이 서고
 * `aria-expanded`와 `aria-controls`로 아래 펼친 목록을 가리킨다. 펼친 동안(`expanded`)은 자동
 * 전환을 멈춘다. 목록이 다 보이는데 띠까지 돌면 같은 항목이 두 자리에서 움직인다.
 *
 * @param label 띠 머리글(실검, 경기)
 * @param items 넘길 항목들
 * @param interval 자동 전환 간격(ms)
 * @param live 머리글을 빨간 LIVE 톤으로
 * @param expanded 아래 전체 목록이 펼쳐져 있는지. 펼친 동안 자동 전환을 멈춘다
 * @param onToggle 펼치기 버튼을 눌렀을 때. 없으면 버튼이 없다
 * @param expandControls 펼친 목록의 id(`aria-controls`)
 */
export function RotatingLine({
  label,
  items,
  interval = 4500,
  live = false,
  expanded = false,
  onToggle,
  expandControls,
}: {
  label: string;
  items: { id: string; content: ReactNode }[];
  interval?: number;
  live?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  expandControls?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interacting = hovered || focused || expanded;
  const count = items.length;
  const current = count ? index % count : 0;
  useEffect(() => {
    if (count < 2 || interacting) return;
    let inView = false;
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
    });
    if (ref.current) observer.observe(ref.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = setInterval(() => {
      if (inView && !document.hidden && !reduced.matches)
        setIndex((value) => (value + 1) % count);
    }, interval);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [count, interval, interacting]);
  if (!count) return null;
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      className="bg-elevate rounded-card flex min-w-0 items-center gap-2 px-3"
    >
      <span
        className={`text-label shrink-0 font-black ${live ? "text-danger-strong" : "text-accent"}`}
      >
        {label}
      </span>
      <div className="relative h-12 min-w-0 flex-1 overflow-hidden">
        <div
          key={items[current]?.id}
          className="animate-line-down flex h-full min-w-0 items-center motion-reduce:animate-none"
        >
          {items[current]?.content}
        </div>
      </div>
      {count > 1 && (
        <button
          type="button"
          aria-label={`${label} 다음 항목, ${current + 1}/${count}`}
          onClick={() => setIndex((value) => (value + 1) % count)}
          className="text-caption text-text-3 focus-visible:outline-accent hover:text-accent min-h-11 min-w-8 shrink-0 tabular-nums focus-visible:outline-2"
        >
          {current + 1}/{count}
        </button>
      )}
      {onToggle && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={expandControls}
          aria-label={expanded ? `${label} 접기` : `${label} 전체 보기`}
          onClick={onToggle}
          className="text-text-3 focus-visible:outline-accent hover:text-accent -mr-1.5 flex min-h-11 min-w-8 shrink-0 items-center justify-center focus-visible:outline-2"
        >
          {expanded ? (
            <ChevronUpIcon size={16} />
          ) : (
            <ChevronDownIcon size={16} />
          )}
        </button>
      )}
    </div>
  );
}
