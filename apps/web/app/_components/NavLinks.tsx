import { NAV_LINKS } from "@/_lib/constants";
import { NavItem } from "./NavItem";

/**
 * GNB 내비게이션 링크 — 현재 경로와 일치하는 항목을 accent 필(pill)로 표시한다.
 * 링크 렌더·활성 판정은 `NavItem`이 담당한다(MobileNav와 공유).
 *
 * @param className - 컨테이너에 덧붙일 클래스(반응형 표시 제어 등)
 */
export function NavLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="주 메뉴"
      className={`flex items-center gap-1 ${className}`}
    >
      {NAV_LINKS.map(({ href, label }) => (
        <NavItem
          key={href}
          href={href}
          label={label}
          className="py-2 focus-visible:outline-offset-2"
        />
      ))}
    </nav>
  );
}
