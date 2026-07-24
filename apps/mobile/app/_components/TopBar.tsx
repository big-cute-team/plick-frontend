import { Logo } from "@plick/ui/Logo";
import { ThemeToggle } from "@plick/ui/ThemeToggle";
import { TopBarShell } from "./TopBarShell";

/**
 * 상단 크롬 (로고 + 테마 토글).
 *
 * 알림 아이콘은 걷어냈다 (KAN-297) — 알림 기능이 없어 자리만 차지했다.
 */
export function TopBar() {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="justify-between"
    >
      <Logo height={18} />
      <ThemeToggle />
    </TopBarShell>
  );
}
