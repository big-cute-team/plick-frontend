"use client";

import { usePathname } from "next/navigation";
import { homeIntroCopy } from "@plick/domain/brand";
import { TEAM_FULL_NAMES } from "@plick/domain/constants";
import { teamFilterFromPathname } from "@plick/domain/format";

/**
 * 홈 푸터의 크롤러블 소개 문구 (KAN-384) — 지금 보는 팀 탭을 따라간다. 시안
 * (KAN-567)에서 자리가 본문 밑 별도 섹션에서 푸터 첫 단락으로 옮겨 가,
 * `SiteFooter`의 `intro`로 들어가는 글자만 돌려준다.
 *
 * 탭 선택은 `history.replaceState`라 서버 컴포넌트가 다시 렌더되지 않는다.
 * 서버에서 문구를 굳히면 처음 연 탭의 팀 이름이 새로고침 전까지 남으므로,
 * URL이 정한 필터를 클라에서 읽어 문구를 갈아 끼운다. SSR 첫 HTML에는
 * 요청 경로 기준 문구가 그대로 실려 크롤러 노출은 유지된다. 모바일
 * `HomeIntro`와 같은 문구를 낸다.
 */
export function HomeIntro() {
  const filter = teamFilterFromPathname(usePathname());
  return homeIntroCopy(filter !== "ALL" ? TEAM_FULL_NAMES[filter] : undefined);
}
