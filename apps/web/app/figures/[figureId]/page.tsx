import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getFigureProfile } from "@plick/core/figures";
import { FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import type { InitialArticleFeed } from "@plick/domain/types";
import { PageContainer } from "@/_components/PageContainer";
import { ProfileBreadcrumb } from "@/_components/ProfileBreadcrumb";
import { ProfileFacts } from "@/_components/ProfileFacts";
import { ScopedArticlesFeed } from "@/_components/ScopedArticlesFeed";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { FigureHeader } from "./_components/FigureHeader";
import { SiteFooter } from "@/_components/SiteFooter";

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
 * 데스크톱 인물 프로필 + 관련 이슈 (KAN-501 → KAN-567 시안 프로필 1215-1420행).
 * 빵부스러기, 머리(회색 원 72, 종류 라벨, 이름 30/900, 영문명 + 소속 팀 링크), 관련
 * 이슈 표, 우측 기본 정보 카드를 `minmax(0,1fr) 300px` 그리드에 둔다. 급상승 랭킹의
 * 선수 줄과 태그 줄이 여기로 들어온다.
 *
 * 시안의 등번호 상자, 숫자 4개(경기, 골, 도움, 평점), 최근 경기 표는 인물 사전에
 * 그 값이 없어 뺐다(인물은 라이브 선수 id와 이어져 있지 않다). 숫자 자리는 시안의
 * `noStats` 여백으로 대신한다.
 *
 * 프로필과 기사 첫 페이지를 병렬로 받는다. 프로필이 404, 400이면 not-found고,
 * 기사 첫 페이지만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다. 목록이
 * 클라에서 다시 받으며 에러, 재시도를 그린다. 두 호출 다 익명 공개 API라 토큰을
 * 싣지 않는다.
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
    // 없는 인물, 운영자가 내린 인물(404)과 정수가 아닌 id(400)는 손으로 친
    // 주소나 옛 링크의 정상 경로다. 에러 화면이 아니라 not-found로 보낸다
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

  const facts = [
    { label: "구분", value: FIGURE_TYPE_LABEL[figure.type] },
    ...(figure.nameEn ? [{ label: "영문명", value: figure.nameEn }] : []),
    ...(figure.team ? [{ label: "소속", value: figure.team.name }] : []),
    ...(figure.description
      ? [{ label: "소개", value: figure.description }]
      : []),
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-5.5 pb-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-11">
          <div className="min-w-0">
            <ProfileBreadcrumb kind={FIGURE_TYPE_LABEL[figure.type]} />
            <FigureHeader figure={figure} />
            {/* 시안의 숫자 4개 자리. 값이 없을 때의 여백(`noStats`)이다 */}
            <div className="h-6.5" />
            <section>
              <p className="text-body-lg text-text-strong pb-1.5 font-black tracking-tight">
                관련 이슈
              </p>
              <ScopedArticlesFeed
                scope={{ kind: "figure", id: figure.id }}
                initial={initial}
                emptyText="아직 올라온 이슈가 없어요"
              />
            </section>
          </div>
          <aside className="flex flex-col gap-3.5">
            <ProfileFacts facts={facts} />
          </aside>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
