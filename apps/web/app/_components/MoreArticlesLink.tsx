"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEAMS } from "@plick/domain/constants";
import { articlesTeamPath, teamFilterFromPathname } from "@plick/domain/format";

/**
 * 홈 → 기사 페이지 더 보기 링크 (KAN-386, 모바일과 같은 판단). 홈 표가 첫 페이지
 * 고정이라 나머지를 보러 가는 통로다. 목적지는 지금 보고 있는 팀의 기사 페이지다.
 *
 * 시안(KAN-567)의 홈 표 밑 페이지 버튼 줄(1 2 3 4 다음, 높이 52, 26px 상자)을
 * 본떴다. BE가 커서 페이지네이션이라 숫자 페이지는 만들 수 없어(API 공백) 상자
 * 하나만 남겼다 — `border-table` 테두리에 12px 보조색, hover에 강조색.
 *
 * 필터는 URL에서 파생한다 — 홈 팀 탭이 `history.replaceState`로 URL만 바꾸므로
 * 서버가 그려 준 prop으로는 따라갈 수 없고, PostFeed와 같은 원본(URL)을 읽어야
 * 어긋나지 않는다. 앵커라서 크롤러가 기사 페이지를 내부 링크로 발견하는 몫도
 * 겸한다.
 *
 * @param variant - `"header"`: 섹션 제목 옆의 작은 "더 보기".
 *   `"footer"`: 표 끝의 페이지 버튼 줄(전체 탭은 "이슈 더 보기").
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
        className="text-label-lg text-text-3 hover:text-accent font-bold"
      >
        더 보기
      </Link>
    );
  }

  return (
    <div className="flex h-13 items-center justify-center">
      <Link
        href={href}
        className="border-border-table text-label text-text-3 hover:text-accent hover:border-accent focus-visible:outline-accent flex h-6.5 items-center border px-2.25 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {filter === "ALL"
          ? "이슈 더 보기"
          : `${TEAMS[filter].name} 이슈 더 보기`}
      </Link>
    </div>
  );
}
