import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getStandings } from "@plick/core/live";
import {
  getTeamFixtures,
  getTeamSeasonStats,
  getTeamSquadTable,
  getTeamSummary,
} from "@plick/core/team-profile";
import {
  TEAMS,
  TEAM_BY_SLUG,
  TEAM_FULL_NAMES,
  TEAM_IDS,
  TEAM_ORDER,
} from "@plick/domain/constants";
import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import { standingsWindow, type TeamSummary } from "@plick/domain/team-profile";
import { PageContainer } from "@/_components/PageContainer";
import { ProfileBreadcrumb } from "@/_components/ProfileBreadcrumb";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import {
  PROFILE_ISSUE_COUNT,
  PROFILE_RECENT_COUNT,
} from "@/_constants/profile";
import { ClubInfoCard } from "./_components/ClubInfoCard";
import { InjuriesCard } from "./_components/InjuriesCard";
import { StandingsWindowCard } from "./_components/StandingsWindowCard";
import { TeamFixturesPanel } from "./_components/TeamFixturesPanel";
import { TeamNumberBand } from "./_components/TeamNumberBand";
import { TeamOverviewPanel } from "./_components/TeamOverviewPanel";
import { TeamProfileHead } from "./_components/TeamProfileHead";
import { TeamProfileView } from "./_components/TeamProfileView";

/**
 * 팀 6개는 고정(`TEAM_ORDER`)이라 빌드 때 전부 미리 그린다 (KAN-667, 모바일 KAN-632). 없으면
 * 동적 파라미터라 첫 요청까지 ƒ(요청마다 렌더)로 남는다.
 */
export function generateStaticParams(): { slug: string }[] {
  return TEAM_ORDER.map((code) => ({ slug: TEAMS[code].slug }));
}

/**
 * 팀 프로필 메타데이터 (KAN-507 → KAN-599). 팀 검색어("토트넘 이적 루머")의 랜딩은 팀
 * 허브(`/teams/[slug]`)가 맡으므로 여기는 순위, 일정, 선수단 쪽으로 제목을 잡는다. 이
 * URL이 canonical이고 대응 모바일 팀 프로필을 alternate로 선언한다. 모르는 slug는 빈
 * 메타데이터로 두면 본문이 notFound()로 떨어진다.
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
    title: `${fullName} 팀 프로필`,
    description: `${fullName} ${LIVE_SEASON_LABEL} 시즌 순위, 경기 일정, 선수단, 기록 모아보기`,
    alternates: {
      canonical: `/teams/${slug}/profile`,
      media: {
        [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/teams/${slug}/profile`,
      },
    },
  };
}

/** allSettled 결과에서 값만 꺼낸다. 실패는 로그를 남기고 null이라 그 영역만 실패를 그린다. */
function settled<T>(result: PromiseSettledResult<T>, label: string): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(`[team] ${label} 로드 실패:`, result.reason);
  return null;
}

/**
 * 데스크톱 팀 프로필 (KAN-507 → KAN-599 시안 팀 프로필 1216-1480행). 경로 표시, 머리,
 * 숫자 띠, 탭(개요, 경기, 선수단, 기록), 본문 `minmax(0,1fr)` + 우측 레일 300px이다.
 *
 * BE 팀 프로필 API 넷과 순위표, 팀 이슈를 서버에서 한 번에 받는다. 머리를 그리는 요약이
 * 404(빅6 밖, 마스터 재시드로 id가 어긋난 경우)면 not-found다. 그 밖의 실패(외부 데이터
 * 장애 502)는 화면을 통째로 막지 않는다. 머리는 레지스트리 이름으로 그리고 숫자 띠는 "-",
 * 보조 블록은 빈 것으로 둔다. 관련 이슈는 우리 DB라 외부 장애와 무관하게 살아 있어서다.
 * 나머지 API도 실패하면 그 영역만 다시 시도를 띄운다. 요약 안의 보조 블록(`info`,
 * `nextFixture`, `standing`)이 null로 오는 부분 실패도 같은 길을 탄다.
 *
 * 경로는 `/teams/[slug]/profile`을 그대로 쓴다. 핸드오프는 `teams/[teamId]`를 제안했지만
 * 같은 깊이에 팀 허브 `(home)/teams/[slug]`가 있어 동적 세그먼트 이름이 부딪히고, 이미
 * 색인되고 공유된 주소와 모든 팀 링크(`teamProfilePath`)가 이 경로를 가리킨다.
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

  const [summaryResult, ...rest] = await Promise.allSettled([
    getTeamSummary(teamId),
    getTeamFixtures(teamId),
    getTeamSeasonStats(teamId),
    getTeamSquadTable(teamId),
    getStandings(),
    getArticles({ team: code, size: PROFILE_ISSUE_COUNT }),
  ] as const);
  const [
    fixturesResult,
    statsResult,
    squadResult,
    standingsResult,
    issuesResult,
  ] = rest;

  if (summaryResult.status === "rejected") {
    const error = summaryResult.reason;
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("[team] 요약 로드 실패:", error);
  }
  const summary: TeamSummary =
    summaryResult.status === "fulfilled"
      ? summaryResult.value
      : {
          teamId,
          name: TEAMS[code].name,
          nameEn: "",
          leagueName: "프리미어리그",
          info: null,
          nextFixture: null,
          standing: null,
          injuries: [],
        };
  const fixtures = settled(fixturesResult, "경기");
  const stats = settled(statsResult, "기록");
  const squad = settled(squadResult, "선수단");
  const standings = settled(standingsResult, "순위표");
  const issues = settled(issuesResult, "이슈");

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-5.5 pb-12">
          <ProfileBreadcrumb kind="팀" />
          <TeamProfileHead code={code} summary={summary} />
          <TeamNumberBand standing={summary.standing} />
          <TeamProfileView
            key={slug}
            overview={
              <TeamOverviewPanel
                code={code}
                issues={issues?.items ?? null}
                recent={
                  fixtures?.results.slice(0, PROFILE_RECENT_COUNT) ?? null
                }
              />
            }
            matches={<TeamFixturesPanel fixtures={fixtures} />}
            squad={squad}
            stats={stats}
            railTop={
              <StandingsWindowCard
                rows={standings && standingsWindow(standings, teamId)}
                teamId={teamId}
              />
            }
            railBottom={
              <>
                {summary.info && <ClubInfoCard info={summary.info} />}
                {summary.injuries.length > 0 && (
                  <InjuriesCard injuries={summary.injuries} />
                )}
              </>
            }
          />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
