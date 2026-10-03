import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getFigureProfile } from "@plick/core/figures";
import { FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import type { InitialArticleFeed } from "@plick/domain/types";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { TabBar } from "@/_components/TabBar";
import { ProfileSectionTitle } from "@/_components/ProfileSectionTitle";
import { FigureArticlesFeed } from "./_components/FigureArticlesFeed";
import { FigureFacts } from "./_components/FigureFacts";
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
 * 인물 프로필 + 관련 이슈 (KAN-500, KAN-567 리디자인, 시안 선수 프로필). 기사
 * 카드·세부·릴 세부의 인물 칩과 팀 프로필의 소속 인물 행에서 들어온다.
 *
 * 상단 바 제목은 인물 구분(선수·감독 등)이고 머리는 이름, 영문명, 소속 팀 링크다.
 * 그 아래 "관련 이슈"(무한 목록)와 "기본 정보"가 온다. 시안의 등번호 상자와
 * 경기·골·도움·평점 숫자 상자, 최근 경기는 인물 사전에 그 값이 없어 뺐다
 * (API 공백). 사진은 시안 규칙대로 그리지 않는다.
 *
 * 프로필과 기사 첫 페이지를 병렬로 받는다. 프로필이 404·400이면 not-found고,
 * 기사 첫 페이지만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다.
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
    // 주소나 옛 링크의 정상 경로다. 에러 화면이 아니라 not-found로 보낸다
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
      <SubTopBar
        title={FIGURE_TYPE_LABEL[figure.type]}
        backHref="/"
        backBehavior="back"
      />
      <ScrollArea className="pb-section">
        <FigureHeader figure={figure} />
        <section>
          <div className="px-edge">
            <ProfileSectionTitle>관련 이슈</ProfileSectionTitle>
          </div>
          <FigureArticlesFeed figureId={figure.id} initial={initial} />
        </section>
        <section className="px-edge">
          <ProfileSectionTitle>기본 정보</ProfileSectionTitle>
          <FigureFacts figure={figure} />
        </section>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
