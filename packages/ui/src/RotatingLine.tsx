"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 한 항목씩 아래로 넘긴다. 화면 밖·탭 숨김·움직임 줄이기 설정에서는 자동 전환을
 * 멈추고, 마우스를 올리거나 안쪽 링크에 포커스가 있는 동안도 멈춰 누르려던 항목이
 * 달아나지 않게 한다. 사용자가 직접 멈추는 버튼은 두지 않는다 (KAN-707). 오른쪽
 * 끝의 `N/M`은 다음 항목으로 넘기는 버튼이다.
 */
export function RotatingLine({
  label,
  items,
  interval = 4500,
  live = false,
}: {
  label: string;
  items: { id: string; content: ReactNode }[];
  interval?: number;
  live?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interacting = hovered || focused;
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
    </div>
  );
}
