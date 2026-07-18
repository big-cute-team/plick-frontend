"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * GNB 링크 하나 — 현재 경로와 일치하면 accent 필(pill)로 표시한다.
 * 가로 GNB(NavLinks)와 모바일 펼침 패널(MobileNav)이 활성 판정·스타일을 공유한다.
 *
 * @param onNavigate - 클릭 시 부가 동작(펼침 패널 닫기 등)
 * @param className - 밀도·포커스 오프셋 등 배치별 변형 클래스
 */
export function NavItem({
  href,
  label,
  onNavigate,
  className = "",
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`text-gnb rounded-control focus-visible:outline-accent px-3.5 focus-visible:outline-2 ${
        active
          ? "bg-accent-tint text-accent font-extrabold"
          : "text-text-2 hover:bg-elevate-2 hover:text-text"
      } ${className}`}
    >
      {label}
    </Link>
  );
}
