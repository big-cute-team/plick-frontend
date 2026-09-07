import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@plick/core/client";
import { getTeamSquad } from "@plick/core/live";
import { TEAM_CODES, TEAMS } from "@plick/domain/constants";
import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { LiveCrest } from "@/live/_components/LiveCrest";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { SquadGroups } from "@/live/_components/SquadGroups";

/** 팀명은 `TEAMS` 레지스트리에서 — BE 응답엔 팀명이 없고 빅6만 유효하다. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const team = teamOf((await params).teamId);
  if (!team) return {};
  return {
    title: `${team.name} 선수단`,
    description: `${team.name} ${LIVE_SEASON_LABEL} 시즌 선수단 명단과 선수별 시즌 스탯을 플릭에서 확인하세요.`,
    alternates: {
      canonical: `/live/teams/${team.id}`,
      media: {
        [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/live/teams/${team.id}`,
      },
    },
  };
}

/**
 * 팀 스쿼드(피그마 LW6, KAN-452). 순위표 레일의 빅6 행에서 들어온다. 빅6 밖
 * 팀은 진입 링크가 없고 모르는 id는 레지스트리에서 걸러 404다. 단발 읽기라
 * 서버 컴포넌트 fetch고 실패하면 명단 자리에 에러 지면을 둔다.
 */
export default async function TeamSquadPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const team = teamOf((await params).teamId);
  if (!team) notFound();

  let squad;
  try {
    squad = await getTeamSquad(team.id, team.name);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("[live] 스쿼드 로드 실패:", error);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pb-22">
          {squad ? (
            <>
              <header className="flex items-center gap-4 pt-7 pb-6">
                <LiveCrest team={squad.team} size={44} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h1 className="text-hero text-text tracking-heading font-extrabold">
                    {squad.team.name}
                  </h1>
                  <p className="text-body text-text-3 font-semibold">
                    선수단 {squad.size}명 · 이적 반영이 며칠 늦을 수 있어요
                  </p>
                </div>
              </header>
              <SquadGroups squad={squad} />
            </>
          ) : (
            <LiveLoadError />
          )}
        </PageContainer>
      </main>
    </>
  );
}

/** 경로 세그먼트 → 빅6 팀. 팀명은 레지스트리의 한글 축약명이다(응답에 팀명이 없다). */
function teamOf(raw: string): { id: number; name: string } | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  const code = TEAM_CODES[id];
  return code ? { id, name: TEAMS[code].name } : null;
}
