import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MOCK_MATCH_DETAILS } from "@plick/domain/live-mock";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { MatchDetailTabs } from "@/live/_components/MatchDetailTabs";
import { MatchHeaderBlock } from "@/live/_components/MatchHeaderBlock";
import { MatchTopBar } from "@/live/_components/MatchTopBar";
import { PreviewBlocks } from "@/live/_components/PreviewBlocks";

/** 목데이터 지면이라 noindex — 배선 후 실경기 메타로 다시 쓴다. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  const detail = MOCK_MATCH_DETAILS[Number(matchId)];
  if (!detail) return {};
  return {
    title: `${detail.header.home.name} vs ${detail.header.away.name}`,
    robots: { index: false },
  };
}

/**
 * 경기 상세(피그마 L5~L9, KAN-446). 상태로 지면이 갈린다 — SCHEDULED는
 * 프리뷰 블록, LIVE·FINISHED는 요약·라인업·스탯 탭, POSTPONED·CANCELLED는
 * 헤더와 안내만. 모르는 id는 404(MATCH_NOT_FOUND 매핑과 같은 동선)다.
 */
export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const detail = MOCK_MATCH_DETAILS[Number(matchId)];
  if (!detail) notFound();

  const { header } = detail;

  return (
    <AppShell>
      <MatchTopBar title={`${header.competition} · ${header.round}`} />
      <ScrollArea>
        <MatchHeaderBlock header={header} />
        {header.status === "SCHEDULED" && detail.preview ? (
          <PreviewBlocks preview={detail.preview} />
        ) : header.status === "POSTPONED" || header.status === "CANCELLED" ? (
          <p className="text-body text-text-4 px-edge py-16 text-center">
            {header.status === "POSTPONED"
              ? "경기가 연기됐어요. 새 일정은 추후 공지돼요."
              : "취소된 경기예요."}
          </p>
        ) : (
          <MatchDetailTabs detail={detail} />
        )}
      </ScrollArea>
    </AppShell>
  );
}
