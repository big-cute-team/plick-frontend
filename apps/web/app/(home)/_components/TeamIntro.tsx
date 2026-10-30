"use client";

import { usePathname } from "next/navigation";
import { TEAM_FULL_NAMES } from "@plick/domain/constants";
import { teamFilterFromPathname } from "@plick/domain/format";
import { TEAM_INTROS } from "@plick/domain/team-intro";
import { ProseBody } from "@plick/ui/ProseBody";

/**
 * 팀 허브의 팀 소개 (KAN-652) - 기사 목록 아래, 하단 배너 위. 구단의 성격과 이적 시장 경향,
 * 이 허브에서 볼 것을 운영자가 쓴 글이다. 팀 허브가 팀 검색어의 랜딩인데 본문이 기사 제목
 * 목록뿐이라 검색 엔진이 읽을 글이 없었다. 홈 탭 전환은 `history.replaceState`라 서버
 * 컴포넌트가 다시 렌더되지 않아 `HomeIntro`처럼 URL이 정한 팀을 클라에서 읽는다. SSR 첫 HTML에는
 * 요청 경로의 팀 소개가 실려 크롤러 노출은 같고, 탭을 바꾸면 그 팀 소개로 갈아 끼운다. 홈(전체)은
 * 소개할 팀이 없어 아무것도 안 그린다. 문안은 `@plick/domain/team-intro`가 모바일과
 * 단일 출처다.
 */
export function TeamIntro() {
  const team = teamFilterFromPathname(usePathname());
  if (team === "ALL") return null;
  const intro = TEAM_INTROS[team];
  return (
    <section className="mt-8.5">
      <h2 className="text-section text-text-strong tracking-title font-black">
        {TEAM_FULL_NAMES[team]} 알아보기
      </h2>
      <div className="max-w-read pt-4">
        <ProseBody
          sections={intro.sections}
          updatedAt={intro.updatedAt}
          headingLevel="h3"
        />
      </div>
    </section>
  );
}
