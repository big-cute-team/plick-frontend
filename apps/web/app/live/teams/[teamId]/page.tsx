import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MOCK_SQUADS } from "@plick/domain/live-mock";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { LiveCrest } from "@/live/_components/LiveCrest";
import { SquadGroups } from "@/live/_components/SquadGroups";

/** 목데이터 지면이라 noindex — 배선 후 실팀 메타로 다시 쓴다. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const squad = MOCK_SQUADS[Number(teamId)];
  if (!squad) return {};
  return {
    title: `${squad.team.name} 선수단`,
    robots: { index: false },
  };
}

/**
 * 팀 스쿼드(피그마 LW6, KAN-446). 순위표 레일의 빅6 행에서 들어온다. 빅6 밖
 * 팀은 진입 링크가 없고 모르는 id는 404(TEAM_NOT_FOUND 매핑 동선)다.
 */
export default async function TeamSquadPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const squad = MOCK_SQUADS[Number(teamId)];
  if (!squad) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pb-22">
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
        </PageContainer>
      </main>
    </>
  );
}
