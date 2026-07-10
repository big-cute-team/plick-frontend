import { BellIcon } from "./icons";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { TopBarShell } from "./TopBarShell";

/**
 * 상단 크롬 (로고 + 테마 토글 + 알림 버튼).
 *
 * @param notif - 알림 뱃지 숫자. 0이면 뱃지를 숨긴다.
 */
export function TopBar({ notif = 0 }: { notif?: number }) {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="justify-between"
    >
      <Logo height={18} />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          aria-label="알림"
          className="rounded-control text-icon relative grid size-9 place-items-center active:opacity-60"
        >
          <BellIcon size={20} />
          {notif > 0 && (
            <span className="rounded-pill bg-accent text-on-accent text-micro absolute top-1.5 right-1.5 grid min-w-4 place-items-center px-1 leading-4 font-extrabold">
              {notif}
            </span>
          )}
        </button>
      </div>
    </TopBarShell>
  );
}
