"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { articlesTeamPath, teamHubPath } from "@plick/domain/format";
import { TABS } from "@/_constants/app";
import { useArticlesRefresh } from "@/_hooks/useArticlesRefresh";
import { useDebatesRefresh } from "@/_hooks/useDebatesRefresh";
import { useHomeRefresh } from "@/_hooks/useHomeRefresh";
import { useReelsRefresh } from "@/_hooks/useReelsRefresh";
import { useViewState } from "@/_stores/view-state";
import type { ScreenKey } from "@/_types/app";

/**
 * 하단 탭 내비게이션.
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
 *
 * @param variant - `"solid"`(기본): bg-nav 배경 + 상단 보더.
 *   `"overlay"`: 릴스처럼 미디어 위에 얹는 그라데이션 스크림 탭(비활성은 흰색 dim).
 */
export function TabBar({
  variant = "solid",
}: {
  variant?: "solid" | "overlay";
}) {
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
  /* 기사 탭도 같은 이유(KAN-386)로 마지막으로 보던 팀의 URL을 목적지로 쓴다 */
  const articlesHref = articlesTeamPath(
    useViewState((state) => state.articlesFilter),
  );
  const refreshHome = useHomeRefresh();
  const refreshReels = useReelsRefresh();
  const refreshArticles = useArticlesRefresh();
  const refreshDebates = useDebatesRefresh();
  const overlay = variant === "overlay";

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
      : screen === "articles"
        ? refreshArticles()
        : screen === "debate"
          ? refreshDebates()
          : refreshReels());
  }

  /** 탭의 목적지 — 피드 탭은 마지막으로 보던 팀 URL, 나머지는 고정 경로 */
  function hrefFor(screen: ScreenKey | undefined, href: string) {
    if (screen === "home") return homeHref;
    if (screen === "articles") return articlesHref;
    return href;
  }

  return (
    <nav
      className={
        overlay
          ? "absolute inset-x-0 bottom-0 z-10"
          : "border-border bg-nav/95 shrink-0 border-t backdrop-blur-md"
      }
      style={{
        paddingBottom: "var(--safe-bottom)",
        // 스크림은 이미지 가독성용 고정 값(테마 무관)
        ...(overlay && {
          backgroundImage:
            "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--plk-scrim) 90%, transparent) 45%)",
        }),
      }}
    >
      <ul className="flex h-14 items-stretch">
        {TABS.map(({ href, label, Icon, match, screen, surface }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={hrefFor(screen, href)}
                onClick={(e) => {
                  if (!active) return;
                  /* 활성이어도 surface 밖(기사 세부)이면 재탭이 아니라
                     목록으로 돌아가는 평범한 이동이다 */
                  if (surface && !surface(pathname)) return;
                  e.preventDefault();
                  retap(screen);
                }}
                className={`flex h-full flex-col items-center justify-center gap-1 ${
                  active
                    ? "text-accent"
                    : overlay
                      ? "text-media-on-dim opacity-85"
                      : "text-text-4"
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
