import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { ThemeToggle } from "@plick/ui/ThemeToggle";
import { BellLineIcon, SearchLineIcon, UserRoundIcon } from "@plick/ui/icons";
import { NavLinks } from "./NavLinks";
import { PageContainer } from "./PageContainer";

/**
 * 데스크톱 상단 GNB — 로고 + 내비게이션 + 검색 + (테마 토글·알림·프로필).
 *
 * @param notif - 알림 뱃지 숫자. 0이면 뱃지를 숨긴다.
 */
export function SiteHeader({ notif = 0 }: { notif?: number }) {
  return (
    <header className="bg-nav border-border sticky top-0 z-40 border-b">
      <PageContainer className="flex h-16 items-center gap-7">
        <Link
          href="/"
          aria-label="PLick 홈"
          className="focus-visible:outline-accent shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Logo height={20} />
        </Link>

        <NavLinks />

        <div className="flex min-w-0 flex-1 justify-end">
          <button
            type="button"
            className="bg-elevate-2 border-border text-body text-text-4 rounded-pill hover:border-border-strong hover:text-text-3 focus-visible:outline-accent flex h-10 w-85 max-w-full items-center gap-2 border px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <SearchLineIcon size={16} />
            팀, 선수, 기자 검색
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle
            className="hover:bg-elevate-2 focus-visible:outline-accent grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
            iconSize={20}
          />
          <button
            type="button"
            aria-label="알림"
            className="text-icon hover:bg-elevate-2 focus-visible:outline-accent relative grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <BellLineIcon size={20} />
            {notif > 0 && (
              <span className="rounded-pill bg-accent text-on-accent text-micro absolute top-0.5 right-0.5 grid min-w-4 place-items-center px-1 leading-4 font-extrabold">
                {notif}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="내 프로필"
            className="bg-avatar text-icon focus-visible:outline-accent grid size-8.5 shrink-0 place-items-center rounded-full hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <UserRoundIcon size={18} />
          </button>
        </div>
      </PageContainer>
    </header>
  );
}
