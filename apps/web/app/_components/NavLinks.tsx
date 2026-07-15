"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/_lib/constants";

/**
 * GNB 내비게이션 링크 — 현재 경로와 일치하는 항목을 accent 필(pill)로 표시한다.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="flex items-center gap-1">
      {NAV_LINKS.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`text-nav rounded-pill focus-visible:outline-accent px-3.5 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              active
                ? "bg-accent-tint text-accent font-extrabold"
                : "text-text-2 hover:bg-elevate-2 hover:text-text"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
