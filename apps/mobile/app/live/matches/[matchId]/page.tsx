import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@plick/core/client";
import { getMatchDetail } from "@plick/core/live";
import type { InitialMatchDetail } from "@plick/domain/live";
import { WEB_SITE_URL } from "@/_constants/site";
import { MatchDetailScreen } from "@/live/_components/MatchDetailScreen";

/**
 * 경기 상세 메타 — 제목은 양 팀명, canonical은 대응 데스크톱 URL. 페이지 본문과
 * 같은 fetch를 부르지만 Next가 요청 안에서 같은 URL의 fetch를 메모하므로 BE
 * 왕복은 한 번이다. 못 받으면(404·502) 기본 제목만 남긴다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const id = parseMatchId((await params).matchId);
  if (id === null) return {};
  try {
    const { header } = await getMatchDetail(id);
    const title = `${header.home.name} vs ${header.away.name}`;
    return {
      title,
      description: `${header.competition} ${title} 라이브 스코어와 라인업, 경기 스탯을 플릭에서 확인하세요.`,
      alternates: { canonical: `${WEB_SITE_URL}/live/matches/${id}` },
    };
  } catch {
    return { title: "경기" };
  }
}

/**
 * 경기 상세(피그마 L5~L9, KAN-452). 첫 상세는 서버에서 받아 씨앗으로 내려주고
 * 라이브 폴링은 클라 훅이 맡는다. 없는 경기·빅6 밖 경기(404 MATCH_NOT_FOUND)는
 * notFound로, 그 밖의 실패는 씨앗 없이 내려보내 클라가 다시 받는다.
 */
export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const id = parseMatchId((await params).matchId);
  if (id === null) notFound();

  let initial: InitialMatchDetail | undefined;
  try {
    initial = { detail: await getMatchDetail(id), fetchedAt: Date.now() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("[live] 경기 상세 초기 로드 실패:", error);
  }

  return <MatchDetailScreen matchId={id} initial={initial} />;
}

/** 경로 세그먼트 → fixture id. 양의 정수가 아니면 null(404 동선). */
function parseMatchId(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}
