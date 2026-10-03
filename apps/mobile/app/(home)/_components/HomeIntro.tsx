"use client";

import { usePathname } from "next/navigation";
import { homeIntroCopy } from "@plick/domain/brand";
import { TEAM_FULL_NAMES } from "@plick/domain/constants";
import { teamFilterFromPathname } from "@plick/domain/format";

/**
 * 크롤러블 서비스 소개 (KAN-384) — 홈 리스트 밑의 소개 문단. 시안(KAN-567)의 홈
 * 하단 소개문 자리 그대로다(11.5/1.7, text-3). 팀 탭 전환을 따라가야 해서 클라
 * 컴포넌트다.
 */
export function HomeIntro() {
  const filter = teamFilterFromPathname(usePathname());
  return (
    <section className="px-edge pt-5.5 pb-2">
      <p className="text-caption-lg text-text-3 leading-[1.7]">
        {homeIntroCopy(filter !== "ALL" ? TEAM_FULL_NAMES[filter] : undefined)}
      </p>
    </section>
  );
}
