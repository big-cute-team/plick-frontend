import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getFigureProfile } from "@plick/core/figures";
import { FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import type { InitialArticleFeed } from "@plick/domain/types";
import { AppShell } from "@/_components/AppShell";
import { ProfileTopBar } from "@/_components/ProfileTopBar";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { FigureArticlesFeed } from "./_components/FigureArticlesFeed";
import { FigureHeader } from "./_components/FigureHeader";

/**
 * 인물별 메타데이터 (KAN-500). "손흥민 이적" 같은 인물 검색어의 랜딩이 될 수
 * 있어 title에 이름과 구분을 넣는다. 없는 인물은 빈 메타데이터로 두면 본문이
 * notFound()로 떨어진다. 익명 fetch라 본문의 같은 호출과 렌더 안에서 중복
 * 제거된다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ figureId: string }>;
}): Promise<Metadata> {
  const { figureId } = await params;
  try {
    const figure = await getFigureProfile(figureId);
    const role = FIGURE_TYPE_LABEL[figure.type];
    const team = figure.team ? `${figure.team.name} ` : "";
    return {
      title: `${figure.name} 관련 기사`,
      description:
        figure.description ??
        `${team}${role} ${figure.name}의 프리미어리그 이적 루머와 관련 기사 모아보기`,
    };
  } catch {
    return {};
  }
}

/**
 * 인물 프로필 + 관련 기사 (KAN-500). 기사 카드·세부·릴 세부의 인물 칩과 팀
 * 프로필의 소속 인물 카드에서 들어온다.
 *
 * 티켓은 "관련 기사 목록"과 "인물 프로필"을 따로 적었지만 한 화면으로 합쳤다.
 * 칩을 눌러 기사 목록만 보면 누구의 기사인지 머리가 없고, 프로필만 보면
 * 사진·한 줄 소개·소속 팀 세 줄로 화면이 끝나 텅 빈다. 프로필을 머리로 두고
 * 그 아래 관련 기사를 무한 목록으로 잇는 게 둘 다 살리는 길이었다.
 *
 * 프로필과 기사 첫 페이지를 병렬로 받는다. 프로필이 404·400이면 not-found고,
 * 기사 첫 페이지만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다 —
 * 목록이 클라에서 다시 받으며 에러·재시도를 그린다(기사 세부의 댓글 씨앗과
 * 같은 판단).
 *
 * 비로그인도 전부 보인다. 두 호출 다 익명 공개 API라 토큰을 싣지 않는다.
 */
export default async function FigurePage({
  params,
}: {
  params: Promise<{ figureId: string }>;
}) {
  const { figureId } = await params;

  const [figureResult, feedResult] = await Promise.allSettled([
    getFigureProfile(figureId),
    getArticles({ figureId }),
  ]);

  if (figureResult.status === "rejected") {
    const e = figureResult.reason;
    // 없는 인물·운영자가 내린 인물(404)과 정수가 아닌 id(400)는 손으로 친
    // 주소나 옛 링크의 정상 경로다 — 에러 화면이 아니라 not-found로 보낸다
    if (
      e instanceof ApiError &&
      (e.code === "FIGURE_NOT_FOUND" || e.code === "COMMON_INVALID_PARAM")
    ) {
      notFound();
    }
    throw e;
  }
  const figure = figureResult.value;

  let initial: InitialArticleFeed | undefined;
  if (feedResult.status === "fulfilled") {
    initial = { page: feedResult.value, fetchedAt: Date.now() };
  } else {
    console.error("[figure] 관련 기사 초기 로드 실패:", feedResult.reason);
  }

  return (
    <AppShell>
      <ProfileTopBar title={figure.name} fallbackHref="/" />
      <ScrollArea className="pb-section">
        <FigureHeader figure={figure} />
        <section className="pt-2">
          <h2 className="text-section tracking-heading text-text px-edge pb-1 font-extrabold">
            관련 기사
          </h2>
          <FigureArticlesFeed figureId={figure.id} initial={initial} />
        </section>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
