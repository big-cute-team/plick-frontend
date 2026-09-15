import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@plick/core/client";
import { getTeamProfile } from "@plick/core/figures";
import {
  TEAMS,
  TEAM_BY_SLUG,
  TEAM_FULL_NAMES,
  TEAM_IDS,
} from "@plick/domain/constants";
import { articlesTeamPath } from "@plick/domain/format";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { AppShell } from "@/_components/AppShell";
import { ProfileTopBar } from "@/_components/ProfileTopBar";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TeamFiguresList } from "./_components/TeamFiguresList";

/**
 * 팀 프로필 메타데이터 (KAN-500). 팀 검색어의 랜딩은 팀 허브(`/teams/[slug]`)가
 * 맡으므로 여기는 선수단 검색어("토트넘 선수단")를 받는 쪽으로 제목을 잡는다.
 * 모르는 slug는 빈 메타데이터로 두면 본문이 notFound()로 떨어진다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const code = TEAM_BY_SLUG[slug];
  if (!code) return {};
  const fullName = TEAM_FULL_NAMES[code];
  return {
    title: `${fullName} 프로필`,
    description: `${fullName} 소속 선수와 감독, 그리고 인물별 이적 루머 모아보기`,
  };
}

/**
 * 팀 프로필 (KAN-500) — 로고·표기와 소속 인물 목록. 기사 카드의 팀 이름·로고,
 * 기사 세부와 릴 세부의 팀 칩, 인물 프로필의 소속 팀에서 들어온다.
 *
 * 팀 허브(`/teams/[slug]`)가 이미 홈 피드를 팀으로 걸러 그리는 자리라 프로필은
 * 그 아래 `/profile`에 뒀다. 팀 관련 기사는 이 화면에 다시 펼치지 않고 기사
 * 목록의 팀 탭(`/articles/teams/[slug]`)으로 보낸다 — 같은 목록이 세 URL에
 * 있으면 어디가 원본인지 흐려진다.
 *
 * slug는 레지스트리로 검증하고 BE는 `TEAM_IDS`의 id로 부른다. 레지스트리에
 * 있는 slug인데 BE가 404를 주면(마스터 재시드로 id가 어긋난 경우) 그것도
 * not-found다 — 사용자에게 보여 줄 게 없는 건 같다.
 */
export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = TEAM_BY_SLUG[slug];
  if (!code) notFound();

  let profile;
  try {
    profile = await getTeamProfile(TEAM_IDS[code]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const team = TEAMS[code];

  return (
    <AppShell>
      <ProfileTopBar title={team.name} fallbackHref="/" />
      <ScrollArea className="pb-section">
        <header className="px-edge flex flex-col gap-3 pt-5 pb-3">
          <div className="flex items-center gap-4">
            <TeamCrest team={team} size={64} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-headline text-text truncate font-extrabold">
                {profile.name}
              </h1>
              <p className="text-label text-text-3 truncate">
                {profile.nameEn}
              </p>
            </div>
          </div>
          {/* 팀 관련 기사는 기사 목록의 팀 탭이 원본이다 */}
          <Link
            href={articlesTeamPath(code)}
            className="bg-elevate rounded-control text-body text-text flex items-center justify-between px-4 py-3 font-bold active:opacity-70"
          >
            {team.name} 관련 기사 보기
            <ChevronMiniIcon size={16} className="text-text-4" />
          </Link>
        </header>
        <TeamFiguresList figures={profile.figures} />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
