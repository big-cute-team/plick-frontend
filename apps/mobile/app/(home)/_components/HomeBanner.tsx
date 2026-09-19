import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronMiniIcon } from "@plick/ui/icons";

/**
 * 핫이슈 위에 서는 얇은 안내 배너의 공용 껍데기 (KAN-504).
 *
 * "오늘 경기 있음"과 "투표 진행 중"이 같은 모양이어야 한다는 게 티켓 요구라
 * 배너 둘이 이 한 줄 레이아웃을 나눠 쓴다. 왼쪽 표식 · 두 줄 본문 · 화살표
 * 순이고, 표식만 배너마다 다르다(경기는 팀 크레스트, 투표는 VS 아이콘).
 *
 * 높이를 억제하는 게 이 컴포넌트의 존재 이유다. 핫이슈 캐러셀이 첫 화면의
 * 주인공이라 그 위에 카드가 서면 캐러셀이 접히는 선 아래로 밀린다. 그래서
 * 카드가 아니라 한 줄 배너고, 본문도 제목 한 줄 + 부연 한 줄로 못 박았다.
 *
 * @param href 배너 전체가 가는 곳. 경기는 `/live`, 투표는 `/debates`.
 * @param leading 왼쪽 표식 슬롯. 폭이 제각각이라 `shrink-0`은 넘기는 쪽이 건다.
 * @param title 첫 줄 — 무슨 일이 있는지 (예: "오늘 경기 3개").
 * @param description 둘째 줄 — 그중 대표 하나 (예: "20:00 맨시티 vs 아스날").
 * @param badge 제목 앞에 붙는 상태 표식. 라이브 경기가 있을 때만 붙는다.
 */
export function HomeBanner({
  href,
  leading,
  title,
  description,
  badge,
}: {
  href: string;
  leading: ReactNode;
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-elevate rounded-card flex items-center gap-3 px-3.5 py-2.5 active:opacity-80"
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label text-text flex items-center gap-1.5 font-extrabold">
          {badge}
          <span className="truncate">{title}</span>
        </span>
        <span className="text-caption text-text-4 truncate">{description}</span>
      </span>
      <ChevronMiniIcon size={16} className="text-text-4 shrink-0" />
    </Link>
  );
}
