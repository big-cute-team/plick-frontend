import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import {
  getPlayerMatches,
  getPlayerProfile,
  getPlayerSeasons,
} from "@plick/core/player-profile";
import { getTeamSquadTable } from "@plick/core/team-profile";
import { teammates } from "@plick/domain/player-profile";
import { AppShell } from "@/_components/AppShell";
import { ProfileScrollArea } from "@/_components/ProfileScrollArea";
import { ProfileSection } from "@/_components/ProfileSection";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { TabBar } from "@/_components/TabBar";
import { TEAMMATE_COUNT } from "@/_constants/player-profile";
import {
  PROFILE_ISSUE_COUNT,
  PROFILE_RECENT_COUNT,
} from "@/_constants/profile";
import { WEB_SITE_URL } from "@/_constants/site";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { PlayerMatchRows } from "./_components/PlayerMatchRows";
import { PlayerOverviewPanel } from "./_components/PlayerOverviewPanel";
import { PlayerProfileHead } from "./_components/PlayerProfileHead";
import { PlayerProfileView } from "./_components/PlayerProfileView";
import { PlayerSeasonsTable } from "./_components/PlayerSeasonsTable";
import { PlayerUsageBox } from "./_components/PlayerUsageBox";
import { TeammatesStrip } from "./_components/TeammatesStrip";

/** 경로 파라미터를 API 선수 id로. 숫자가 아니면 null이라 not-found다. */
function parsePlayerId(raw: string): number | null {
  return /^\d{1,10}$/.test(raw) ? Number(raw) : null;
}

/** allSettled 결과에서 값만 꺼낸다. 실패는 로그를 남기고 null이라 그 영역만 실패를 그린다. */
function settled<T>(result: PromiseSettledResult<T>, label: string): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(`[player] ${label} 로드 실패:`, result.reason);
  return null;
}

/**
 * 빈 목록이어도 선언해 둔다 (KAN-632). Next는 `generateStaticParams`가 아예 없는 동적 세그먼트를
 * 요청마다 렌더(ƒ)로 다루고, 있으면(목록 밖 값 포함) 첫 요청에 그려 fetch의 revalidate만큼 캐시한다.
 * 인물은 수가 많고 늘어나서 빌드 때 전부 그리지는 않는다.
 */
export function generateStaticParams(): { playerId: string }[] {
  return [];
}

/**
 * 선수 프로필 메타데이터 (KAN-604). 프로필 fetch는 본문과 같은 URL, 같은 캐시 옵션이라 Next
 * 데이터 캐시에서 한 번만 나간다. 실패하면(404, 502) 빈 메타데이터로 두고 본문이 처리한다.
 * canonical은 대응 데스크톱 선수 프로필(KAN-600)이다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const playerId = parsePlayerId((await params).playerId);
  if (playerId === null) return {};
  try {
    const profile = await getPlayerProfile(playerId);
    const team = profile.team ? `${profile.team.name} ` : "";
    return {
      title: `${profile.name} 선수 프로필`,
      description: `${team}${profile.name} 시즌 기록, 경기 기록, 관련 이슈 모아보기`,
      alternates: { canonical: `${WEB_SITE_URL}/players/${playerId}` },
    };
  } catch {
    return {};
  }
}

/**
 * 선수 프로필 (KAN-604, 시안 선수 프로필 모바일). 하위 바("선수") 아래 머리(사진, 등번호,
 * 이름, 소속팀, 신상), 숫자 상자, sticky 탭 줄(개요, 기록, 경기)이다. 경로 id는
 * API-Football 선수 id이고 선수단 행, 팀 내 순위, 부상자, 같은 팀 선수가 여기로 온다.
 *
 * 웹 KAN-600과 같은 흐름이다. 프로필, 경기 기록, 시즌별 기록을 먼저 함께 받고, 프로필의
 * 소속팀으로 선수단(같은 팀 선수)을, 연결 인물로 관련 이슈를 이어서 받는다. 프로필이
 * 404(빅6 소속 아님)면 not-found, 그 밖의 실패(외부 데이터 장애 502)면 다시 시도만 보여 준다.
 * 선수는 팀처럼 이름을 대신할 레지스트리가 없어서다. 나머지는 그 영역만 다시 시도를 띄운다.
 */
export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const playerId = parsePlayerId((await params).playerId);
  if (playerId === null) notFound();

  const [profileResult, matchesResult, seasonsResult] =
    await Promise.allSettled([
      getPlayerProfile(playerId),
      getPlayerMatches(playerId),
      getPlayerSeasons(playerId),
    ] as const);

  if (profileResult.status === "rejected") {
    const error = profileResult.reason;
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("[player] 프로필 로드 실패:", error);
    return (
      <AppShell>
        <SubTopBar title="선수" backHref="/" backBehavior="back" />
        <ScrollArea>
          <LiveLoadError />
        </ScrollArea>
        <TabBar />
      </AppShell>
    );
  }
  const profile = profileResult.value;
  const matches = settled(matchesResult, "경기 기록");
  const seasons = settled(seasonsResult, "시즌별 기록");

  const team = profile.team;
  const [squadResult, issuesResult] = await Promise.allSettled([
    team?.id ? getTeamSquadTable(team.id) : Promise.resolve(null),
    profile.figureId !== null
      ? getArticles({
          figureId: String(profile.figureId),
          size: PROFILE_ISSUE_COUNT,
        })
      : Promise.resolve({ items: [], nextCursor: null }),
  ] as const);
  const squad = settled(squadResult, "선수단");
  const issues = settled(issuesResult, "이슈");
  const mates = squad ? teammates(squad.players, playerId, TEAMMATE_COUNT) : [];

  return (
    <AppShell>
      <SubTopBar title="선수" backHref="/" backBehavior="back" />
      {/* 당겨서 새로고침은 서버 갱신이다 (KAN-681). 이 화면은 전부 서버가 그린다 */}
      <ProfileScrollArea>
        <div className="px-edge">
          <PlayerProfileHead profile={profile} />
          <PlayerProfileView
            key={playerId}
            competitions={profile.competitions}
            isKeeper={profile.position === "GK"}
            matches={matches}
            overview={
              <>
                <PlayerOverviewPanel
                  issues={issues?.items ?? null}
                  recent={matches?.slice(0, PROFILE_RECENT_COUNT) ?? null}
                />
                <PlayerUsageBox matches={matches} />
                {team && mates.length > 0 && (
                  <TeammatesStrip team={team} players={mates} />
                )}
              </>
            }
            matchesTab={
              matches === null ? (
                <LiveLoadError />
              ) : matches.length === 0 ? (
                <ProfileSection title="경기 기록">
                  <p className="text-body text-text-4 py-6">
                    아직 치른 경기가 없어요
                  </p>
                </ProfileSection>
              ) : (
                <div className="pt-2">
                  <PlayerMatchRows matches={matches} />
                </div>
              )
            }
            seasons={<PlayerSeasonsTable lines={seasons} />}
          />
        </div>
      </ProfileScrollArea>
      <TabBar />
    </AppShell>
  );
}
