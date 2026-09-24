import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { TopBarShell } from "./TopBarShell";
import { TopBarMenu } from "./TopBarMenu";

/**
 * 상단 크롬 (로고 + 햄버거 메뉴) — 시안(KAN-567) 앱 셸의 46px 상단 바.
 * 왼쪽에 해축이모 글자 로고 19px, 오른쪽에 햄버거 20px. 아래 선은 섹션 구분선이다.
 *
 * 로고는 웹 GNB와 같은 관용으로 어디서든 홈으로 가는 링크다.
 * `z-50`은 햄버거 메뉴 몫이다 — 메뉴가 바깥 탭을 삼키려고 까는 스크림(z-40)보다 위에
 * 있어야 메뉴 항목이 스크림에 가리지 않는다.
 *
 * @param divider - 아래 구분선. 릴스만 선 없이(false) 미디어 상자와 바로 이어진다.
 */
export function TopBar({ divider = true }: { divider?: boolean }) {
  return (
    <TopBarShell
      className={`relative z-50 ${divider ? "border-border border-b" : ""}`}
      innerClassName="justify-between"
    >
      <Link href="/" className="active:opacity-70">
        <Logo size={19} />
      </Link>
      <TopBarMenu />
    </TopBarShell>
  );
}
