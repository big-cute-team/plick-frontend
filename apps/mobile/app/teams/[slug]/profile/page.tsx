import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@plick/core/client";
import { getTeamProfile } from "@plick/core/figures";
import { getTeamSquad } from "@plick/core/live";
import {
  TEAMS,
  TEAM_BY_SLUG,
  TEAM_FULL_NAMES,
  TEAM_IDS,
} from "@plick/domain/constants";
import { articlesTeamPath } from "@plick/domain/format";
import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { AppShell } from "@/_components/AppShell";
import { ProfileTopBar } from "@/_components/ProfileTopBar";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { SquadList } from "@/live/_components/SquadList";
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
    title: `${fullName} 선수단`,
    description: `${fullName} ${LIVE_SEASON_LABEL} 시즌 선수단과 소속 인물, 인물별 이적 루머 모아보기`,
  };
}

/**
 * 팀 프로필 (KAN-500, KAN-507에서 라이브 팀 화면을 합침) — 로고·표기, 이번 시즌
 * 선수단, 기사에 나온 소속 인물.
 *
 * 한 팀을 보는 화면이 두 장으로 갈려 있었다. 라이브 순위표에서 팀을 누르면
 * `/live/teams/[teamId]`(API-Football 선수단)로, 기사 쪽 팀 칩·로고를 누르면
 * 여기로 왔다. 같은 팀인데 어디로 들어왔느냐에 따라 다른 화면이 뜨는 게
 * 이상해서 이 한 장으로 합쳤다. 라이브 쪽 URL은 여기로 리다이렉트한다.
 *
 * 두 명단은 출처가 다르고 겹치지도 않아 섹션을 갈라 둔다. "선수단"은
 * API-Football의 이번 시즌 등록 명단이고 행을 누르면 시즌 스탯 시트가 열린다.
 * "기사에 나온 인물"은 PLick 인물 사전이라 감독·구단주까지 들어 있고 행을
 * 누르면 그 인물의 관련 기사로 간다.
 *
 * 팀 허브(`/teams/[slug]`)가 이미 홈 피드를 팀으로 걸러 그리는 자리라 프로필은
 * 그 아래 `/profile`에 뒀다. 팀 관련 기사는 이 화면에 다시 펼치지 않고 기사
 * 목록의 팀 탭(`/articles/teams/[slug]`)으로 보낸다 — 같은 목록이 세 URL에
 * 있으면 어디가 원본인지 흐려진다.
 *
 * slug는 레지스트리로 검증하고 BE는 `TEAM_IDS`의 id로 부른다. 인물 사전이
 * 404면(마스터 재시드로 id가 어긋난 경우) 보여 줄 게 없어 not-found다. 선수단만
 * 실패하면 페이지를 죽이지 않고 그 섹션 자리에만 실패를 보여준다 — 라이브 API는
 * 외부(API-Football) 의존이라 인물 사전보다 덜 미덥다.
 */
export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = TEAM_BY_SLUG[slug];
  if (!code) notFound();

  const teamId = TEAM_IDS[code];
  const [profileResult, squadResult] = await Promise.allSettled([
    getTeamProfile(teamId),
    getTeamSquad(teamId, TEAMS[code].name),
  ]);

  if (profileResult.status === "rejected") {
    const error = profileResult.reason;
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const profile = profileResult.value;

  const squad = squadResult.status === "fulfilled" ? squadResult.value : null;
  if (squadResult.status === "rejected") {
    console.error("[team] 선수단 로드 실패:", squadResult.reason);
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

        <section className="pt-2">
          <div className="px-edge flex items-baseline gap-2">
            <h2 className="text-section tracking-heading text-text font-extrabold">
              선수단
            </h2>
            {squad && (
              <span className="text-label text-text-4 font-semibold">
                {LIVE_SEASON_LABEL} · {squad.size}명
              </span>
            )}
          </div>
          {squad ? (
            <>
              {/* 외부 명단이라 이적 반영이 늦을 수 있다는 건 라이브 화면에서부터
                  달고 있던 안내다 */}
              <p className="px-edge text-caption text-text-4 pt-1">
                이적 반영이 며칠 늦을 수 있어요
              </p>
              <SquadList squad={squad} />
            </>
          ) : (
            <p className="text-body text-text-4 py-10 text-center">
              선수단을 불러오지 못했어요.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-section tracking-heading text-text px-edge font-extrabold">
            기사에 나온 인물
          </h2>
          <TeamFiguresList figures={profile.figures} />
        </section>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
