import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MOCK_SQUADS } from "@plick/domain/live-mock";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { LiveCrest } from "@/live/_components/LiveCrest";
import { MatchTopBar } from "@/live/_components/MatchTopBar";
import { SquadList } from "@/live/_components/SquadList";

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
 * 팀 스쿼드(피그마 L11, KAN-446). 순위표 빅6 행에서 들어온다. 빅6 밖 팀은
 * `teamId`가 없어 진입 링크 자체가 없고, 모르는 id는 404(TEAM_NOT_FOUND
 * 매핑과 같은 동선)다.
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
    <AppShell>
      <MatchTopBar title="선수단" />
      <ScrollArea>
        <div className="px-edge flex items-center gap-3 pt-5 pb-4">
          <LiveCrest team={squad.team} size={40} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-headline text-text font-extrabold">
              {squad.team.name}
            </h1>
            <p className="text-caption text-text-4">
              선수단 {squad.size}명 · 이적 반영이 며칠 늦을 수 있어요
            </p>
          </div>
        </div>
        <SquadList squad={squad} />
      </ScrollArea>
    </AppShell>
  );
}
