"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "dark" | "light";

// data-theme 속성을 <html>에서 토글. 새로고침 유지는 추후 localStorage로 확장.
export function ThemeToggle() {
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
      className="rounded-control text-icon grid size-9 place-items-center active:opacity-60"
    >
      {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  );
}
