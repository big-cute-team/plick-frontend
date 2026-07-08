"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { BellIcon, HomeIcon, ReelsIcon, SearchIcon, UserIcon } from "./icons";

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  { href: "/", label: "홈", Icon: HomeIcon, match: (p) => p === "/" },
  {
    href: "/search",
    label: "검색",
    Icon: SearchIcon,
    match: (p) => p.startsWith("/search"),
  },
  {
    href: "/reels",
    label: "릴스",
    Icon: ReelsIcon,
    match: (p) => p.startsWith("/reels"),
  },
  {
    href: "/alerts",
    label: "알림",
    Icon: BellIcon,
    match: (p) => p.startsWith("/alerts"),
  },
  {
    href: "/me",
    label: "MY",
    Icon: UserIcon,
    match: (p) => p.startsWith("/me"),
  },
];

// 하단 탭. pb에 safe-area-inset-bottom을 더해 홈 인디케이터/제스처 영역을 피한다.
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="border-border bg-nav/95 shrink-0 border-t backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-14 items-stretch">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-1 ${
                  active ? "text-accent" : "text-text-4"
                } active:opacity-60`}
              >
                <Icon size={22} />
                <span className="text-[10px] font-bold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
