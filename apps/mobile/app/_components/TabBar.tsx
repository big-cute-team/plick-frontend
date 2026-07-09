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
// variant="overlay": 릴스처럼 미디어 위에 얹는 그라데이션 탭(배경 대신 스크림, 비활성은 흰색 dim).
export function TabBar({
  variant = "solid",
}: {
  variant?: "solid" | "overlay";
}) {
  const pathname = usePathname();
  const overlay = variant === "overlay";
  return (
    <nav
      className={
        overlay
          ? "absolute inset-x-0 bottom-0 z-10"
          : "border-border bg-nav/95 shrink-0 border-t backdrop-blur-md"
      }
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        // 스크림은 이미지 가독성용 고정 값(테마 무관)
        ...(overlay && {
          backgroundImage:
            "linear-gradient(to bottom, rgba(4,6,11,0) 0%, rgba(4,6,11,0.9) 45%)",
        }),
      }}
    >
      <ul className="flex h-14 items-stretch">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-1 ${
                  active
                    ? "text-accent"
                    : overlay
                      ? "text-media-on-dim opacity-85"
                      : "text-text-4"
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
