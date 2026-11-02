"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 한 항목씩 아래로 넘긴다. 읽는 중·화면 밖·움직임 줄이기 설정에서는 자동 전환을 멈춘다. */
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
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interacting = hovered || focused;
  const count = items.length;
  const current = count ? index % count : 0;
  useEffect(() => {
    if (count < 2 || paused || interacting) return;
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
  }, [count, interval, paused, interacting]);
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
        <div className="text-caption text-text-3 flex shrink-0 items-center">
          <button
            type="button"
            aria-label={`${label} 다음 항목, ${current + 1}/${count}`}
            onClick={() => setIndex((value) => (value + 1) % count)}
            className="focus-visible:outline-accent hover:text-accent min-h-11 min-w-8 tabular-nums focus-visible:outline-2"
          >
            {current + 1}/{count}
          </button>
          <button
            type="button"
            aria-label={`${label} 자동 넘김 ${paused ? "재생" : "멈춤"}`}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
            className="focus-visible:outline-accent hover:text-accent min-h-11 min-w-8 focus-visible:outline-2"
          >
            {paused ? "재생" : "멈춤"}
          </button>
        </div>
      )}
    </div>
  );
}
