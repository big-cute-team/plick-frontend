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
import { ChevronRightIcon } from "@plick/ui/icons";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { TabBar } from "@/_components/TabBar";
import { ProfileFacts } from "@/_components/ProfileFacts";
import { ProfileSectionTitle } from "@/_components/ProfileSectionTitle";
import { ProfileStats } from "@/_components/ProfileStats";
import { SquadList } from "./_components/SquadList";
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
 * 팀 프로필 (KAN-500, KAN-507에서 라이브 팀 화면을 합침, KAN-567 리디자인, 시안
 * 팀 프로필). 머리(엠블럼 60, 이름, 영문명), 숫자 상자(순위·승점·전적·득실),
 * 선수단, 기사 속 인물, 관련 이슈 링크, 기본 정보를 세로로 쌓는다.
 *
 * 한 팀을 보는 화면이 두 장으로 갈려 있었다. 라이브 순위표에서 팀을 누르면
 * `/live/teams/[teamId]`(API-Football 선수단)로, 기사 쪽 팀 칩·로고를 누르면
 * 여기로 왔다. 같은 팀인데 어디로 들어왔느냐에 따라 다른 화면이 뜨는 게
 * 이상해서 이 한 장으로 합쳤다. 라이브 쪽 URL은 여기로 리다이렉트한다.
 *
 * 선수단(KAN-484에서 탭으로 갈랐던 둘)은 시안대로 섹션으로 되돌렸다. "선수단"은
 * API-Football의 이번 시즌 등록 명단이고 행을 누르면 시즌 스탯 시트가 열린다.
 * "기사 속 인물"은 해축이모 인물 사전이라 감독·구단주까지 들어 있고 행을 누르면
 * 그 인물의 프로필로 간다. 팀 관련 기사는 이 화면에 다시 펼치지 않고 기사
 * 목록의 팀 탭(`/articles/teams/[slug]`)으로 보낸다. 같은 목록이 세 URL에
 * 있으면 어디가 원본인지 흐려진다.
 *
 * 순위 요약(KAN-514)은 `GET /standings` 20행에서 이 팀 행만 골라 숫자 상자에
 * 넣는다. 시안의 최근 5경기 폼, 감독·홈구장·창단은 팀 단위 API가 없어 뺐다.
 *
 * slug는 레지스트리로 검증하고 BE는 `TEAM_IDS`의 id로 부른다. 인물 사전이
 * 404면(마스터 재시드로 id가 어긋난 경우) 보여 줄 게 없어 not-found다. 선수단만
 * 실패하면 페이지를 죽이지 않고 그 섹션 자리에만 실패를 보여준다. 라이브 API는
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
     레지스트리와 어긋난 시즌) 상자를 비운다. 부가 정보라 없는 편이 낫다 */
  const standing =
    standingsResult.status === "fulfilled"
      ? (standingsResult.value.find((row) => row.team.id === teamId) ?? null)
      : null;
  if (standingsResult.status === "rejected") {
    console.error("[team] 순위표 로드 실패:", standingsResult.reason);
  }

  const team = TEAMS[code];

  return (
    <AppShell>
      <SubTopBar title="팀" backHref="/" backBehavior="back" />
      <ScrollArea className="pb-section">
        <div className="px-edge">
          <header className="flex items-center gap-3.5 pt-5 pb-4.5">
            <TeamCrest team={team} size={60} />
            <div className="min-w-0 flex-1">
              <h1 className="text-profile tracking-title text-text-strong font-black">
                {profile.name}
              </h1>
              <p className="text-label-lg text-text-3 mt-1.5 truncate">
                {profile.nameEn
                  ? `${profile.nameEn}, 프리미어리그`
                  : "프리미어리그"}
              </p>
            </div>
          </header>

          {standing && (
            <ProfileStats
              items={[
                { label: "순위", value: `${standing.rank}위` },
                { label: "승점", value: String(standing.points) },
                {
                  label: "전적",
                  value: `${standing.win}승 ${standing.draw}무 ${standing.lose}패`,
                },
                { label: "득실", value: formatGoalDiff(standing.goalDiff) },
              ]}
            />
          )}

          <ProfileSectionTitle>선수단</ProfileSectionTitle>
          {squad ? (
            <SquadList squad={squad} />
          ) : (
            <p className="text-body text-text-4 py-6">
              선수단을 불러오지 못했어요
            </p>
          )}

          {profile.figures.length > 0 && (
            <>
              <ProfileSectionTitle>기사 속 인물</ProfileSectionTitle>
              <TeamFiguresList figures={profile.figures} />
            </>
          )}

          <ProfileSectionTitle>관련 이슈</ProfileSectionTitle>
          {/* 팀 관련 기사는 기사 목록의 팀 탭이 원본이다 */}
          <Link
            href={articlesTeamPath(code)}
            className="border-border-soft text-body text-text-strong flex items-center justify-between border-b py-3 font-bold active:opacity-70"
          >
            {team.name} 이슈 모아보기
            <ChevronRightIcon size={16} className="text-text-4" />
          </Link>

          <ProfileSectionTitle>기본 정보</ProfileSectionTitle>
          <ProfileFacts
            items={[
              { label: "리그", value: "프리미어리그" },
              ...(profile.nameEn
                ? [{ label: "영문명", value: profile.nameEn }]
                : []),
              ...(standing
                ? [{ label: "경기 수", value: `${standing.played}경기` }]
                : []),
              { label: "시즌", value: LIVE_SEASON_LABEL },
            ]}
          />
        </div>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}

/** 득실차는 부호를 붙여야 읽힌다. 0은 부호 없이 그대로 둔다. */
function formatGoalDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}
