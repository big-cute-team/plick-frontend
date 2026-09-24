"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ME_NAV } from "@/_constants/me";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { LogoutButton } from "./LogoutButton";

/**
 * MY 좌측 메뉴 (KAN-567 시안 MY 579-588행) — 내 활동, 계정, 차단 목록 텍스트 메뉴에
 * 구분선을 두고 로그아웃, 회원 탈퇴를 붙인다. 활성 항목은 700 제목색, 나머지는
 * 500 보조색이고 hover면 제목색이 된다.
 *
 * 활성 판정은 경로로 한다. `/me`는 정확히 같을 때만이고(하위 경로가 다른 항목이라),
 * 나머지는 접두어로 본다. 로그아웃과 탈퇴는 확인 팝업이 있는 클라 버튼이라 이 메뉴가
 * 클라 컴포넌트다.
 */
export function MeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="MY 메뉴" className="flex flex-col">
      {ME_NAV.map(({ href, label }) => {
        const on =
          href === "/me" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`text-body hover:text-text-strong focus-visible:outline-accent py-2.25 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              on ? "text-text-strong font-bold" : "text-text-3 font-medium"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <span aria-hidden className="bg-border mt-3.5 mb-3 h-px" />
      <LogoutButton />
      <DeleteAccountButton />
    </nav>
  );
}
