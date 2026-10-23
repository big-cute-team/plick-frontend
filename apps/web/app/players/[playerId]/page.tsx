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
import { PageContainer } from "@/_components/PageContainer";
import { ProfileBreadcrumb } from "@/_components/ProfileBreadcrumb";
import { ProfileSection } from "@/_components/ProfileSection";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import { TEAMMATE_COUNT } from "@/_constants/player-profile";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import {
  PROFILE_ISSUE_COUNT,
  PROFILE_RECENT_COUNT,
} from "@/_constants/profile";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { PlayerMatchRows } from "./_components/PlayerMatchRows";
import { PlayerOverviewPanel } from "./_components/PlayerOverviewPanel";
import { PlayerProfileHead } from "./_components/PlayerProfileHead";
import { PlayerProfileView } from "./_components/PlayerProfileView";
import { PlayerSeasonsTable } from "./_components/PlayerSeasonsTable";
import { PlayerUsageCard } from "./_components/PlayerUsageCard";
import { TeammatesCard } from "./_components/TeammatesCard";

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
 * 빈 목록이어도 선언해 둔다 (KAN-667, 모바일 KAN-632). Next는 `generateStaticParams`가 아예 없는
 * 동적 세그먼트를 요청마다 렌더(ƒ)로 다루고, 있으면(목록 밖 값 포함) 첫 요청에 그려 fetch의
 * revalidate만큼 캐시한다. 선수는 수가 많고 늘어나서 빌드 때 전부 그리지는 않는다.
 */
export function generateStaticParams(): { playerId: string }[] {
  return [];
}

/**
 * 선수 프로필 메타데이터 (KAN-600). 프로필 fetch는 본문과 같은 URL, 같은 캐시 옵션이라 Next 데이터
 * 캐시에서 한 번만 나간다. 실패하면(404, 502) 빈 메타데이터로 두고 본문이 처리한다. 대응 모바일
 * 선수 프로필(KAN-604)을 alternate로 선언한다(팀 프로필과 같은 상호 참조).
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
      alternates: {
        canonical: `/players/${playerId}`,
        media: {
          [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/players/${playerId}`,
        },
      },
    };
  } catch {
    return {};
  }
}

/**
 * 데스크톱 선수 프로필 (KAN-600, 시안 선수 프로필 1473-1636행). 경로 표시, 머리, 숫자 띠, 탭(개요,
 * 기록, 경기), 본문 `minmax(0,1fr)` + 우측 레일 300px이다. 경로 id는 API-Football 선수 id다.
 *
 * 프로필, 경기 기록, 시즌별 기록을 먼저 함께 받고, 프로필에서 나온 소속팀으로 선수단(같은 팀 선수)을,
 * 연결 인물로 관련 이슈를 이어서 받는다. 프로필이 404(빅6 소속 아님)면 not-found, 그 밖의 실패
 * (외부 데이터 장애 502)면 다시 시도만 보여 준다. 선수는 팀처럼 이름을 대신할 레지스트리가 없어서다.
 * 나머지는 실패해도 그 영역만 다시 시도를 띄운다.
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
      <>
        <SiteHeader />
        <main>
          <PageContainer className="pt-5.5 pb-12">
            <ProfileBreadcrumb kind="선수" />
            <LiveLoadError message="선수 정보를 불러오지 못했어요" />
          </PageContainer>
        </main>
        <SiteFooter />
      </>
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
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-5.5 pb-12">
          <ProfileBreadcrumb kind="선수" />
          <PlayerProfileHead profile={profile} />
          <PlayerProfileView
            key={playerId}
            competitions={profile.competitions}
            isKeeper={profile.position === "GK"}
            matches={matches}
            overview={
              <PlayerOverviewPanel
                issues={issues?.items ?? null}
                recent={matches?.slice(0, PROFILE_RECENT_COUNT) ?? null}
              />
            }
            matchesTab={
              <ProfileSection title="경기 기록">
                {matches === null ? (
                  <LiveLoadError />
                ) : matches.length === 0 ? (
                  <p className="text-body text-text-4 py-7">
                    아직 치른 경기가 없어요
                  </p>
                ) : (
                  <PlayerMatchRows matches={matches} variant="full" />
                )}
              </ProfileSection>
            }
            seasons={<PlayerSeasonsTable lines={seasons} />}
            rail={
              <>
                <PlayerUsageCard matches={matches} />
                {team && mates.length > 0 && (
                  <TeammatesCard team={team} players={mates} />
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
