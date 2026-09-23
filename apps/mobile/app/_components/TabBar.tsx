"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { teamHubPath } from "@plick/domain/format";
import { TABS } from "@/_constants/tabs";
import { useDebatesRefresh } from "@/_hooks/useDebatesRefresh";
import { useHomeRefresh } from "@/_hooks/useHomeRefresh";
import { useReelsRefresh } from "@/_hooks/useReelsRefresh";
import { useViewState } from "@/_stores/view-state";
import type { ScreenKey } from "@/_types/app";

/**
 * 하단 탭 내비게이션 — 시안(KAN-567) 앱 셸의 54px 탭 5개(홈, LIVE, 릴스, 투표, MY).
 * 아이콘 22px 아래 라벨 10/700, 활성 탭은 강조색이고 비활성은 보조 회색이다.
 * 위 선은 섹션 구분선이고 바탕은 흰색이다. 릴스도 시안이 라이트라 오버레이 변형은 없앴다.
 *
 * pb에 `safe-area-inset-bottom`을 더해 홈 인디케이터/제스처 영역을 피한다.
 *
 * 탭은 두 가지로 동작한다 (KAN-314). 다른 탭으로 가는 건 평범한 이동이고, 그쪽
 * 화면은 두고 온 상태 그대로 되살아난다(`useViewState`). 지금 있는 탭을 한 번 더
 * 누르면 이동 대신 그 화면을 맨 위로 올리고 첫 페이지부터 다시 받는다 — 목록을 위로
 * 쓸어 올리는 수고 없이 새 소식으로 갈아 끼우는, 앱에서 익숙한 손버릇이다.
 *
 * 같은 경로로 가는 `Link`는 원래 아무 일도 하지 않으므로, 활성 탭에서는 기본
 * 동작을 막고 직접 처리한다.
 */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const requestTop = useViewState((state) => state.requestTop);
  /**
   * 홈 탭의 목적지 — 마지막으로 보던 팀 필터의 URL (KAN-350). 필터가 URL로
   * 승격되면서(`/teams/[slug]`) 홈 href를 `/`로 고정하면 릴스·기사에 다녀올 때마다
   * 전체 탭으로 돌아가 버린다. 스토어에 남긴 마지막 필터로 href를 만들어, 홈 탭이
   * 항상 두고 온 그 화면(같은 URL)으로 되돌린다 — KAN-314의 복원 감각 유지.
   */
  const homeHref = teamHubPath(useViewState((state) => state.homeFilter));
  const refreshHome = useHomeRefresh();
  const refreshReels = useReelsRefresh();
  const refreshDebates = useDebatesRefresh();

  /** 지금 있는 탭을 다시 눌렀을 때 — 맨 위로 올리고 새로 받는다 */
  function retap(screen?: ScreenKey) {
    if (!screen) {
      // 되돌릴 자리가 없는 화면(MY)은 서버에서 다시 그려 주기만 하면 된다
      router.refresh();
      return;
    }
    requestTop(screen);
    void (screen === "home"
      ? refreshHome()
      : screen === "debate"
        ? refreshDebates()
        : refreshReels());
  }

  /** 탭의 목적지 — 홈 탭은 마지막으로 보던 팀 URL, 나머지는 고정 경로 */
  function hrefFor(screen: ScreenKey | undefined, href: string) {
    if (screen === "home") return homeHref;
    return href;
  }

  return (
    <nav
      className="border-border bg-nav shrink-0 border-t"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="flex h-13.5 items-stretch">
        {TABS.map(({ href, label, Icon, match, screen }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={hrefFor(screen, href)}
                onClick={(e) => {
                  if (!active) return;
                  e.preventDefault();
                  retap(screen);
                }}
                className={`flex h-full flex-col items-center justify-center gap-1 ${
                  active ? "text-accent" : "text-text-4"
                } active:opacity-60`}
              >
                <Icon size={22} />
                <span className="text-micro font-bold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
