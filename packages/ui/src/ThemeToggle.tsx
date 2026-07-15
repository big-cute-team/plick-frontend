"use client";

import { useEffect, useState } from "react";
import { MoonLineIcon, SunLineIcon } from "./icons";

type Theme = "dark" | "light";

/**
 * 다크/라이트 토글 — `<html data-theme>`만 바꾸면 토큰이 전체 UI를 전환한다.
 *
 * 새로고침 유지는 추후 localStorage로 확장.
 *
 * @param className - 버튼 박스 스타일(크기·라운드·hover 등). 기본값은 모바일 TopBar 규격.
 * @param iconSize - 아이콘 렌더 크기(px)
 */
export function ThemeToggle({
  className = "rounded-control grid size-9 place-items-center active:opacity-60",
  iconSize = 20,
}: {
  className?: string;
  iconSize?: number;
}) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light") setTheme("light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={`text-icon ${className}`}
    >
      {theme === "dark" ? (
        <SunLineIcon size={iconSize} />
      ) : (
        <MoonLineIcon size={iconSize} />
      )}
    </button>
  );
}
