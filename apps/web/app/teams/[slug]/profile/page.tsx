import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@plick/core/client";
import { getTeamProfile } from "@plick/core/figures";
import { getStandings, getTeamSquad } from "@plick/core/live";
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
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { TeamProfileTabs } from "./_components/TeamProfileTabs";
import { TeamStandingCard } from "./_components/TeamStandingCard";

/**
 * 팀 프로필 메타데이터 (KAN-507). 팀 검색어("토트넘 이적 루머")의 랜딩은 팀
 * 허브(`/teams/[slug]`)가 맡으므로 여기는 선수단 검색어 쪽으로 제목을 잡는다.
 * 이 URL이 canonical이고 대응 모바일 팀 프로필을 alternate로 선언한다. 모르는
 * slug는 빈 메타데이터로 두면 본문이 notFound()로 떨어진다.
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
    alternates: {
      canonical: `/teams/${slug}/profile`,
      media: {
        [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/teams/${slug}/profile`,
      },
    },
  };
}

/**
 * 데스크톱 팀 프로필 (KAN-507) — 로고·표기, 이번 시즌 선수단, 기사에 나온 소속
 * 인물. 모바일 `/teams/[slug]/profile`의 데스크톱 판이다.
 *
 * 웹에는 이 화면이 없었다. 라이브 순위표에서 팀을 누르면 선수단만 있는
 * `/live/teams/[teamId]`로 갔고, 인물 사전 명단은 볼 데가 아예 없었다. 모바일과
 * 같은 한 장으로 맞추면서 라이브 쪽 URL은 여기로 리다이렉트한다.
 *
 * 두 명단은 출처가 달라 탭으로 갈라 둔다 (KAN-484, 그전에는 섹션을 위아래로
 * 쌓았다). "선수단"은 API-Football 이번 시즌 등록 명단이고 타일을 누르면 시즌
 * 스탯 모달이 열린다. "기사 속 인물"은 PLick 인물 사전이라 감독·구단주까지 있고
 * 행을 누르면 관련 기사로 간다.
 *
 * 인물 사전이 404면 보여 줄 게 없어 not-found고, 선수단만 실패하면 그 탭
 * 자리에만 실패를 보여준다 — 라이브 API는 외부 의존이라 덜 미덥다.
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
  const [profileResult, squadResult, standingsResult] =
    await Promise.allSettled([
      getTeamProfile(teamId),
      getTeamSquad(teamId, TEAMS[code].name),
      getStandings(),
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

  /* 순위는 20행 중 이 팀 행만 쓴다. 못 받거나 그 팀이 없으면(승격·강등으로
     레지스트리와 어긋난 시즌) 카드 자리를 비운다 — 부가 정보라 없는 편이 낫다 */
  const standing =
    standingsResult.status === "fulfilled"
      ? (standingsResult.value.find((row) => row.team.id === teamId) ?? null)
      : null;
  if (standingsResult.status === "rejected") {
    console.error("[team] 순위표 로드 실패:", standingsResult.reason);
  }

  const team = TEAMS[code];

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pb-22">
          <header className="flex flex-col gap-5 pt-7 pb-8">
            <div className="flex items-center gap-5">
              <TeamCrest team={team} size={72} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h1 className="text-hero text-text tracking-heading truncate font-extrabold">
                  {profile.name}
                </h1>
                <p className="text-body text-text-3 truncate font-semibold">
                  {profile.nameEn}
                </p>
              </div>
            </div>
            {standing && <TeamStandingCard row={standing} />}

            {/* 팀 관련 기사는 기사 목록의 팀 탭이 원본이다 */}
            <Link
              href={articlesTeamPath(code)}
              className="bg-elevate rounded-control text-body-lg text-text hover:bg-elevate-2 focus-visible:outline-accent flex w-fit items-center gap-2 px-5 py-3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {team.name} 관련 기사 보기
              <ChevronMiniIcon size={16} className="text-text-4" />
            </Link>
          </header>

          <TeamProfileTabs squad={squad} figures={profile.figures} />
        </PageContainer>
      </main>
    </>
  );
}
