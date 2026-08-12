"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEAMS } from "@plick/domain/constants";
import { articlesTeamPath, teamFilterFromPathname } from "@plick/domain/format";
import { ChevronMiniIcon } from "@plick/ui/icons";

/**
 * 홈 → 기사 페이지 더보기 링크 (KAN-386). 홈 리스트가 첫 페이지 고정이 되면서
 * 나머지를 보러 가는 통로다. 섹션 제목 옆(header)과 리스트 끝(footer) 두 자리에
 * 놓이고, 목적지는 둘 다 지금 보고 있는 팀의 기사 페이지다 — 위아래 링크가
 * 서로 다른 곳으로 가면 헷갈린다.
 *
 * 필터는 URL에서 파생한다 — 홈 팀 탭이 `history.replaceState`로 URL만 바꾸므로
 * 서버가 그려 준 prop으로는 따라갈 수 없고, NewsFeed와 같은 원본(URL)을 읽어야
 * 어긋나지 않는다. 앵커라서 크롤러가 기사 페이지를 내부 링크로 발견하는 몫도
 * 겸한다(팀 탭이 앵커인 것과 같은 이유).
 *
 * @param variant - `"header"`: 섹션 제목 옆의 작은 "더보기".
 *   `"footer"`: 리스트 끝의 "○○ 소식 더보기" 블록 버튼(전체 탭은 "기사 더보기").
 */
export function MoreArticlesLink({
  variant,
}: {
  variant: "header" | "footer";
}) {
  const filter = teamFilterFromPathname(usePathname());
  const href = articlesTeamPath(filter);

  if (variant === "header") {
    return (
      <Link
        href={href}
        className="text-label text-text-4 flex items-center font-bold active:opacity-60"
      >
        더보기
        <ChevronMiniIcon size={14} />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="bg-elevate text-label text-text rounded-control mt-2 flex items-center justify-center gap-0.5 py-3 font-bold active:opacity-70"
    >
      {filter === "ALL" ? "기사 더보기" : `${TEAMS[filter].name} 소식 더보기`}
      <ChevronMiniIcon size={14} />
    </Link>
  );
}
