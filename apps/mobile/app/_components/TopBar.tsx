import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { TopBarShell } from "./TopBarShell";
import { TopBarMenu } from "./TopBarMenu";

/**
 * 상단 크롬 (로고 + 햄버거 메뉴).
 *
 * 로고는 웹 GNB와 같은 관용으로 어디서든 홈으로 가는 링크다.
 *
 * 알림 아이콘은 걷어냈다 (KAN-297) — 알림 기능이 없어 자리만 차지했다.
 * 테마 토글도 걷어냈다 — 앱을 다크 고정으로 돌렸다. 라이트 토큰은 `theme.css`에
 * 그대로 남아 있어 되살릴 때 화면을 다시 만들 필요는 없다.
 * 그 자리엔 하단 탭과 같은 목적지를 여는 햄버거 메뉴가 들어간다({@link TopBarMenu}).
 * `z-50`은 그 메뉴 몫이다 — 메뉴가 바깥 탭을 삼키려고 까는 스크림(z-40)보다 위에
 * 있어야 메뉴 항목이 스크림에 가리지 않는다.
 */
export function TopBar() {
  return (
    <TopBarShell
      className="border-border bg-nav/90 relative z-50 border-b backdrop-blur-md"
      innerClassName="justify-between"
    >
      <Link href="/" className="active:opacity-70">
        <Logo height={18} />
      </Link>
      <TopBarMenu />
    </TopBarShell>
  );
}
