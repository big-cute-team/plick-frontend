import type { Metadata } from "next";
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
import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { PageContainer } from "@/_components/PageContainer";
import { ProfileBreadcrumb } from "@/_components/ProfileBreadcrumb";
import { ProfileFacts } from "@/_components/ProfileFacts";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { TeamProfileTabs } from "./_components/TeamProfileTabs";
import { TeamStatsRow } from "./_components/TeamStatsRow";
import { SiteFooter } from "@/_components/SiteFooter";

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
 * 데스크톱 팀 프로필 (KAN-507 → KAN-567 시안 프로필 1215-1420행). 빵부스러기, 머리
 * (엠블럼 72, "팀" 라벨, 이름 30/900, 영문명), 숫자 4개(순위, 승점, 전적, 득실),
 * 선수단 표와 기사 속 인물, 우측 기본 정보 카드를 `minmax(0,1fr) 300px` 그리드에 둔다.
 * 모바일 `/teams/[slug]/profile`의 데스크톱 판이다.
 *
 * 두 명단은 출처가 달라 탭으로 갈라 둔다 (KAN-484). "선수단"은 API-Football 이번
 * 시즌 등록 명단이고 행을 누르면 시즌 스탯 다이얼로그가 열린다. "기사 속 인물"은
 * 해축이모 인물 사전이라 감독, 구단주까지 있고 행을 누르면 관련 기사로 간다.
 *
 * 시안의 최근 5경기 카드와 관련 이슈 표는 팀 단위 API가 없어 뺐다(팀 기사는 팀
 * 허브가 맡는다). 기본 정보의 감독, 홈구장, 창단도 API에 없어 영문명과 시즌만 둔다.
 * 인물 사전이 404면 보여 줄 게 없어 not-found고, 선수단만 실패하면 그 탭 자리에만
 * 실패를 보여준다. 라이브 API는 외부 의존이라 덜 미덥다.
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

  /* 순위는 20행 중 이 팀 행만 쓴다. 못 받거나 그 팀이 없으면(승격, 강등으로
     레지스트리와 어긋난 시즌) 숫자 줄을 비운다. 부가 정보라 없는 편이 낫다 */
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
        <PageContainer className="grid grid-cols-1 gap-10 pt-5.5 pb-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-11">
          <div className="min-w-0">
            <ProfileBreadcrumb kind="팀" />
            <header className="border-border flex items-center gap-5 border-b pb-5.5">
              <TeamCrest team={team} size={72} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-label text-accent pb-1.5 font-bold">팀</p>
                <h1 className="text-read-title text-text-strong tracking-title truncate leading-[1.2] font-black">
                  {profile.name}
                </h1>
                <p className="text-body text-text-3 truncate pt-2.25">
                  {profile.nameEn}
                </p>
              </div>
            </header>

            {standing ? (
              <TeamStatsRow row={standing} />
            ) : (
              <div className="h-6.5" />
            )}

            <TeamProfileTabs
              slug={slug}
              squad={squad}
              figures={profile.figures}
            />
          </div>
          <aside className="flex flex-col gap-3.5">
            <ProfileFacts
              facts={[
                { label: "영문명", value: profile.nameEn },
                { label: "리그", value: "프리미어리그" },
                { label: "시즌", value: LIVE_SEASON_LABEL },
              ]}
            />
          </aside>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
