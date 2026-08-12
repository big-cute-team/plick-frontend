"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { articlesTeamPath, teamHubPath } from "@plick/domain/format";
import { FEED_SURFACE_BY_PATH } from "@/_constants/app";
import { useFeedRefresh } from "@/_hooks/useFeedRefresh";
import { useViewState } from "@/_stores/view-state";

/**
 * GNB 링크 하나 — 현재 경로와 일치하면 accent 필(pill)로 표시한다.
 * 가로 GNB(NavLinks)와 모바일 펼침 패널(MobileNav)이 활성 판정·스타일을 공유한다.
 *
 * 홈·기사 링크의 목적지는 고정 경로가 아니라 마지막으로 보던 팀 필터의 URL이다
 * (KAN-350, 모바일 하단 탭과 같은 판단). 필터가 URL로 승격되면서
 * (`/teams/[slug]`·`/articles/teams/[slug]`) href를 `/`·`/articles`로 고정하면
 * MY 등에 다녀올 때마다 전체 탭으로 돌아가 버린다. 스토어에 동기화해 둔 마지막
 * 필터로 href를 만들어, 링크가 항상 두고 온 그 화면(같은 URL)으로 되돌린다.
 *
 * 링크는 두 가지로 동작한다 (KAN-321, 모바일 탭 재탭 KAN-314와 동일). 다른
 * 페이지로 가는 건 평범한 이동이고, 지금 있는 페이지의 링크를 한 번 더 누르면
 * 이동 대신 맨 위로 올리고 첫 페이지부터 다시 받는다. 같은 경로로 가는 `Link`는
 * 원래 아무 일도 하지 않으므로 기본 동작을 막고 직접 처리한다. 재클릭 판정은
 * pill(`active`)과 달리 정확히 그 목적지일 때만이다 — 기사 세부
 * (`/articles/123`)에서 "기사"를 누르는 건 목록으로 돌아가는 평범한 이동이어야
 * 한다.
 *
 * @param onNavigate - 클릭 시 부가 동작(펼침 패널 닫기 등)
 * @param className - 밀도·포커스 오프셋 등 배치별 변형 클래스
 */
export function NavItem({
  href,
  label,
  onNavigate,
  className = "",
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const refreshFeed = useFeedRefresh();
  const feedFilters = useViewState((state) => state.feedFilters);

  /** 실제 목적지 — 피드 surface 링크는 마지막으로 보던 팀 필터의 URL */
  const target =
    href === "/"
      ? teamHubPath(feedFilters.news)
      : href === "/articles"
        ? articlesTeamPath(feedFilters.article)
        : href;

  const active =
    href === "/"
      ? pathname === "/" || pathname.startsWith("/teams")
      : pathname.startsWith(href);

  return (
    <Link
      href={target}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        onNavigate?.();
        if (pathname !== target) return;
        event.preventDefault();
        window.scrollTo({ top: 0 });
        void refreshFeed(FEED_SURFACE_BY_PATH[href]);
      }}
      className={`text-gnb rounded-control focus-visible:outline-accent px-3.5 focus-visible:outline-2 ${
        active
          ? "bg-accent-tint text-accent font-extrabold"
          : "text-text-2 hover:bg-elevate-2 hover:text-text"
      } ${className}`}
    >
      {label}
    </Link>
  );
}
