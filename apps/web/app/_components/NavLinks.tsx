import { NAV_LINKS } from "@/_constants/app";
import { NavItem } from "./NavItem";

/**
 * 상단 바 둘째 줄의 탭 묶음 (KAN-567). 현재 경로와 일치하는 항목을 밑줄로 표시한다.
 * 링크 렌더·활성 판정은 `NavItem`이 담당한다.
 *
 * 넘치면 가로 스크롤이다 — 330px에서 탭 다섯 개가 한 줄에 안 들어가면 잘리는
 * 대신 넘긴다(스크롤바는 `no-scrollbar`가 숨긴다). 햄버거로 접던 시절의
 * `MobileNav`는 시안에 없어 지웠다.
 *
 * @param className - 컨테이너에 덧붙일 클래스(폭·거터 등)
 */
export function NavLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="주 메뉴"
      className={`no-scrollbar flex items-center overflow-x-auto ${className}`}
    >
      {NAV_LINKS.map(({ href, label }) => (
        <NavItem key={href} href={href} label={label} />
      ))}
    </nav>
  );
}
