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
} from "@plick/domain/constants";
import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import { standingsWindow, type TeamSummary } from "@plick/domain/team-profile";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { TabBar } from "@/_components/TabBar";
import {
  PROFILE_ISSUE_COUNT,
  PROFILE_RECENT_COUNT,
} from "@/_constants/profile";
import { WEB_SITE_URL } from "@/_constants/site";
import { TeamFixturesPanel } from "./_components/TeamFixturesPanel";
import { TeamOverviewPanel } from "./_components/TeamOverviewPanel";
import { TeamProfileHead } from "./_components/TeamProfileHead";
import { TeamProfileView } from "./_components/TeamProfileView";

/**
 * 팀 프로필 메타데이터 (KAN-500 → KAN-604). 팀 검색어의 랜딩은 팀 허브(`/teams/[slug]`)가
 * 맡으므로 여기는 순위, 일정, 선수단 쪽으로 제목을 잡는다(웹 KAN-599와 같은 문구). canonical은
 * 대응 데스크톱 팀 프로필이다. 모르는 slug는 빈 메타데이터로 두면 본문이 notFound()로 떨어진다.
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
    alternates: { canonical: `${WEB_SITE_URL}/teams/${slug}/profile` },
  };
}

/** allSettled 결과에서 값만 꺼낸다. 실패는 로그를 남기고 null이라 그 영역만 실패를 그린다. */
function settled<T>(result: PromiseSettledResult<T>, label: string): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(`[team] ${label} 로드 실패:`, result.reason);
  return null;
}

/**
 * 팀 프로필 (KAN-500, KAN-567 리디자인, KAN-604 시안 팀 프로필 모바일). 하위 바("팀") 아래
 * 머리(엠블럼, 이름, 숫자 상자, 다음 경기)와 sticky 탭 줄(개요, 경기, 선수단, 기록)이다.
 *
 * 웹 KAN-599와 같은 BE 팀 프로필 API 넷(요약, 경기, 시즌 기록, 선수단)과 순위표, 팀 이슈를
 * 서버에서 한 번에 받는다. 머리를 그리는 요약이 404(빅6 밖, 마스터 재시드로 id가 어긋난
 * 경우)면 not-found다. 그 밖의 실패(외부 데이터 장애 502)는 화면을 막지 않는다. 머리는
 * 레지스트리 이름으로 그리고 숫자 상자는 "-", 보조 블록은 뺀다. 관련 이슈는 우리 DB라
 * 외부 장애와 무관하게 살아 있어서다. 나머지 API도 실패하면 그 영역만 다시 시도를 띄운다.
 *
 * 전에는 선수단, 팀 정보 두 탭(KAN-574)이었고 선수단 칩을 누르면 시즌 스탯 시트가 열렸다.
 * 이제 선수단 행은 선수 프로필(`/players/[playerId]`)로 간다.
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
    <AppShell>
      <SubTopBar title="팀" backHref="/" backBehavior="back" />
      <ScrollArea className="pb-section">
        <div className="px-edge">
          <TeamProfileHead code={code} summary={summary} />
          <TeamProfileView
            key={slug}
            slug={slug}
            overview={
              <TeamOverviewPanel
                code={code}
                teamId={teamId}
                issues={issues?.items ?? null}
                recent={
                  fixtures?.results.slice(0, PROFILE_RECENT_COUNT) ?? null
                }
                standings={standings && standingsWindow(standings, teamId)}
                info={summary.info}
              />
            }
            matches={<TeamFixturesPanel fixtures={fixtures} />}
            squad={squad}
            stats={stats}
            injuries={summary.injuries}
          />
        </div>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
