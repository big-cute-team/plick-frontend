import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getFigureProfile } from "@plick/core/figures";
import { FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import type { InitialArticleFeed } from "@plick/domain/types";
import { ScopedArticlesFeed } from "@/_components/ScopedArticlesFeed";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { FigureHeader } from "./_components/FigureHeader";

/**
 * 인물별 메타데이터 (KAN-501) — "손흥민 이적" 같은 인물 검색어의 랜딩이 될 수
 * 있어 title에 이름과 구분을 넣는다. 이 URL이 canonical이고 대응 모바일 인물
 * 페이지를 alternate로 선언한다(KAN-346과 같은 규약). 없는 인물은 빈
 * 메타데이터로 두면 본문이 notFound()로 떨어진다. 익명 fetch라 본문의 같은
 * 호출과 렌더 안에서 중복 제거된다.
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
      alternates: {
        canonical: `/figures/${figureId}`,
        media: {
          [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/figures/${figureId}`,
        },
      },
    };
  } catch {
    return {};
  }
}

/**
 * 데스크톱 인물 프로필 + 관련 기사 (KAN-501). 사이드바 급상승 랭킹의 선수 줄이
 * 여기로 들어온다.
 *
 * 모바일에는 KAN-500에서 같은 화면이 생겼는데 웹에는 없었다. 급상승 랭킹의
 * 선수를 누를 곳이 필요해 이번에 이식했다 — 팀은 팀 허브(`/teams/[slug]`)가
 * 이미 그 팀 기사를 모아 보여주지만 인물에는 대응 자리가 없었다.
 *
 * 화면 구성은 모바일과 같다. 프로필을 머리로 두고 그 아래 관련 기사를 무한
 * 목록으로 잇는다 — 기사 목록만 보면 누구의 기사인지 머리가 없고, 프로필만
 * 보면 세 줄로 화면이 끝난다. 폭은 기사 목록과 같은 `max-w-read` 단일 컬럼이다.
 *
 * 프로필과 기사 첫 페이지를 병렬로 받는다. 프로필이 404·400이면 not-found고,
 * 기사 첫 페이지만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다 — 목록이
 * 클라에서 다시 받으며 에러·재시도를 그린다.
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
    const error = figureResult.reason;
    // 없는 인물·운영자가 내린 인물(404)과 정수가 아닌 id(400)는 손으로 친
    // 주소나 옛 링크의 정상 경로다 — 에러 화면이 아니라 not-found로 보낸다
    if (
      error instanceof ApiError &&
      (error.code === "FIGURE_NOT_FOUND" ||
        error.code === "COMMON_INVALID_PARAM")
    ) {
      notFound();
    }
    throw error;
  }
  const figure = figureResult.value;

  let initial: InitialArticleFeed | undefined;
  if (feedResult.status === "fulfilled") {
    initial = { page: feedResult.value, fetchedAt: Date.now() };
  } else {
    console.error("[figure] 관련 기사 초기 로드 실패:", feedResult.reason);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-read px-gutter mx-auto w-full pb-22">
          <FigureHeader figure={figure} />
          <section>
            <h2 className="text-section text-text tracking-heading pb-2 font-extrabold">
              관련 기사
            </h2>
            <ScopedArticlesFeed
              scope={{ kind: "figure", id: figure.id }}
              initial={initial}
              emptyText="아직 이 인물의 소식이 없어요."
            />
          </section>
        </div>
      </main>
    </>
  );
}
