"use client";

import { useState } from "react";
import { CloseIcon, MenuIcon } from "@plick/ui/icons";
import { NAV_LINKS } from "@/_lib/constants";
import { NavItem } from "./NavItem";

/**
 * 모바일 GNB — 햄버거 버튼 + 펼침 패널(내비 링크 세로 스택).
 *
 * 데스크톱(lg↑)에선 숨기고 `SiteHeader`가 가로 내비를 직접 보여준다.
 * 링크 렌더·활성 판정은 `NavItem`이 담당한다(NavLinks와 공유).
 *
 * @param className - 래퍼에 덧붙일 클래스(표시 제어: `lg:hidden` 등)
 */
export function MobileNav({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="메뉴"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-icon hover:bg-elevate-2 focus-visible:outline-accent grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
      </button>

      {open && (
        <>
          {/* 바깥 클릭으로 닫기 — 헤더 아래 전체를 덮는 투명 백드롭 */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-30 cursor-default"
          />
          <nav
            aria-label="주 메뉴"
            className="bg-nav border-border rounded-card absolute top-full right-0 z-40 mt-2 flex w-44 flex-col gap-1 border p-2 shadow-lg"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                onNavigate={() => setOpen(false)}
                className="py-2.5 focus-visible:-outline-offset-2"
              />
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
