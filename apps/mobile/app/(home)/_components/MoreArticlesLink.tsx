"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { articlesTeamPath, teamFilterFromPathname } from "@plick/domain/format";

/**
 * 홈 리스트에서 기사 페이지로 가는 링크 (KAN-386, 시안 KAN-567). 지금 보는 팀 탭을
 * 그대로 들고 간다.
 *
 * @param variant - `header`: 섹션 제목 옆 "더보기"(11.5/700 강조색).
 *   `footer`: 리스트 끝의 "기사 더 보기"(높이 44, 테두리 텍스트 버튼).
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
        className="text-caption-lg text-accent font-bold active:opacity-60"
      >
        더보기
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="border-border-strong text-label-lg text-text-2 rounded-control mt-3.5 flex h-11 items-center justify-center border font-bold active:opacity-70"
    >
      기사 더 보기
    </Link>
  );
}
