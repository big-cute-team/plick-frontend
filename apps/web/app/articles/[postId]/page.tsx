import { notFound } from "next/navigation";
import { getArticle } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { getAccessToken } from "@/_services/session";
import { ArticleMain } from "./_components/ArticleMain";
import { ArticleSidebar } from "./_components/ArticleSidebar";

/**
 * 데스크톱 기사 세부 페이지 (퍼블리싱 KAN-233, API 연결 KAN-322) — GNB + 본문
 * 컬럼(추천 기사 포함) + 우측 사이드바(관련·인기). 홈·기사 목록에서 기사를
 * 선택하면 진입한다. 피그마 W11(node 293-2).
 *
 * 데스크톱은 본문(1fr) + 사이드바(320px) 2열, `lg` 미만에선 사이드바를 숨기고
 * 본문 1열로 스택한다(홈과 동일한 반응형 규칙).
 *
 * 상세(`GET /api/v1/articles/{articleId}`)는 단발 읽기라 서버 컴포넌트 fetch로
 * 받는다. 토큰이 있으면 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다.
 *
 * 사이드바(관련·실시간 인기)와 본문 밑 추천 행은 대응 BE 엔드포인트가 아직 없어
 * 자리만 두고 준비 중 문구를 그린다 — 모바일 KAN-283과 같은 원칙으로, 추천
 * API가 생기기 전까지 목이나 피드 슬라이싱으로 채우지 않는다.
 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const accessToken = await getAccessToken();

  let article;
  try {
    article = await getArticle(postId, accessToken);
  } catch (error) {
    // 없는 id·미발행 기사(404)와 정수가 아닌 id(400)는 삭제된 딥링크나 손으로
    // 친 주소의 정상 경로다 — 에러 화면이 아니라 not-found로 보낸다
    if (
      error instanceof ApiError &&
      (error.code === "ARTICLE_NOT_FOUND" ||
        error.code === "COMMON_INVALID_PARAM")
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6 pb-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ArticleMain article={article} />
            <ArticleSidebar className="hidden lg:flex" />
          </div>
        </PageContainer>
      </main>
    </>
  );
}
