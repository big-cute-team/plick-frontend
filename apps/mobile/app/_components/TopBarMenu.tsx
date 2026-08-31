"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "@plick/ui/icons";
import { TABS } from "@/_constants/tabs";

/**
 * 상단바 우측 햄버거 메뉴 — 하단 탭과 같은 목적지(홈·릴스·MY)를 위에서도 연다.
 *
 * 하단 `TabBar`와 같은 {@link TABS}를 읽는다. 두 자리가 같은 목록을 봐야 한 쪽만
 * 늘거나 줄어드는 일이 없다. 지금 있는 화면은 탭바와 같은 기준(`match`)으로 강조한다.
 *
 * 패널은 상단바 안에 `absolute`로 붙이고, 바깥 탭을 받는 스크림만 body로 포털을 뚫는다.
 * 상단바에 걸린 `backdrop-blur`가 그 안쪽 `fixed`의 기준 상자가 돼서 화면 전체를 덮는
 * 스크림을 상단바 안에서는 그릴 수 없기 때문이다(`ShareDialog`가 body 포털을 쓰는 것과
 * 같은 이유). 패널까지 포털로 빼지 않는 건 앱 껍데기가 480px로 중앙 정렬되는 넓은
 * 화면에서 패널이 뷰포트 오른쪽 끝으로 날아가지 않게 하려는 것이다.
 *
 * 스크림은 투명하지만 탭을 삼킨다. 없으면 닫으려고 누른 그 탭이 밑의 기사 카드까지
 * 눌러 원치 않는 화면으로 넘어간다. 그래서 상단바를 스크림보다 위(z-50 대 z-40)에 둬야
 * 메뉴 항목이 스크림에 가리지 않는다 — 그 z는 `TopBar`가 준다.
 */
export function TopBarMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* 다른 화면으로 넘어가면 닫는다. 같은 화면을 고르면 경로가 안 바뀌므로 클릭에서도 닫는다 */
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-icon rounded-control grid size-9 place-items-center active:opacity-60"
      >
        <MenuIcon size={20} />
      </button>

      {open && (
        <>
          {createPortal(
            <button
              type="button"
              aria-label="메뉴 닫기"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />,
            document.body,
          )}

          <ul
            role="menu"
            className="bg-nav border-border rounded-card drop-shadow-media absolute top-full right-0 mt-1.5 w-33 overflow-hidden border py-1"
          >
            {TABS.map(({ href, label, Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href} role="none">
                  <Link
                    role="menuitem"
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`${
                      active ? "text-accent" : "text-text-2"
                    } text-body flex items-center gap-2.5 px-4 py-2.5 font-bold active:opacity-60`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
