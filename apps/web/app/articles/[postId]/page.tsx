import { notFound } from "next/navigation";
import {
  getArticle,
  getHotArticles,
  getRelatedArticles,
} from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getComments } from "@plick/core/comments";
import type { ArticleCard, InitialCommentPage } from "@plick/domain/types";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { getAccessToken } from "@/_services/session";
import { ArticleMain } from "./_components/ArticleMain";
import { ArticleSidebar } from "./_components/ArticleSidebar";
import { ArticleViewTracker } from "./_components/ArticleViewTracker";

/**
 * 데스크톱 기사 세부 페이지 (퍼블리싱 KAN-233, API 연결 KAN-322, 댓글 KAN-329) —
 * GNB + 본문 컬럼(추천 기사 포함) + 우측 사이드바(관련·인기). 홈·기사 목록에서
 * 기사를 선택하면 진입한다. 피그마 W11(node 293-2).
 *
 * 데스크톱은 본문(1fr) + 사이드바(320px) 2열, `lg` 미만에선 사이드바를 숨기고
 * 본문 1열로 스택한다(홈과 동일한 반응형 규칙).
 *
 * 상세(`GET /api/v1/articles/{articleId}`)는 단발 읽기라 서버 컴포넌트 fetch로
 * 받는다. 토큰이 있으면 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다.
 * 댓글 첫 페이지도 같은 렌더에서 병렬로 받아 클라 캐시의 씨앗으로 심는다 —
 * 안 심으면 목록 훅이 마운트되자마자 같은 페이지를 또 받는다(이중 페치).
 * 댓글 fetch만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다 — 목록이
 * 클라에서 다시 받으면서 에러·재시도를 보여준다.
 *
 * 진입 자체는 조회로 기록한다(KAN-332) — 서버 렌더가 아니라 브라우저에 마운트된
 * 뒤에 보낸다({@link ArticleViewTracker}).
 *
 * 사이드바는 KAN-338에서 채웠다. 실시간 인기는 홈과 같은 핫이슈 데이터를 상세와
 * 병렬로 받고, 관련 기사는 기사의 팀태그가 필요해 상세를 받은 뒤 이어 받는다
 * (`getRelatedArticles` — 팀 필터 목록에서 자기 자신을 거르고 5개). 실패해도
 * 기사 본문은 떠야 해서 그 섹션 자리에만 실패를 보여준다. 본문 밑 추천 행은
 * 웹에선 채우지 않기로 해서(사이드바 관련 기사와 중복) 준비 중 문구로 남긴다 —
 * 모바일 "함께 보면 좋은 기사"는 같은 데이터로 채웠다.
 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const accessToken = await getAccessToken();

  const [articleResult, commentsResult, hotResult] = await Promise.allSettled([
    getArticle(postId, accessToken),
    getComments(postId, { accessToken }),
    getHotArticles(),
  ]);

  if (articleResult.status === "rejected") {
    const error = articleResult.reason;
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

  const initialComments: InitialCommentPage | undefined =
    commentsResult.status === "fulfilled"
      ? { page: commentsResult.value, fetchedAt: Date.now() }
      : undefined;

  const hot = hotResult.status === "fulfilled" ? hotResult.value : null;
  if (hotResult.status === "rejected") {
    console.error("[article] 실시간 인기 로드 실패:", hotResult.reason);
  }

  // 관련 기사는 기사의 팀태그가 필요해 상세를 받은 뒤 이어 받는다
  let related: ArticleCard[] | null = null;
  try {
    related = await getRelatedArticles(
      articleResult.value.id,
      articleResult.value.teams,
    );
  } catch (error) {
    console.error("[article] 관련 기사 로드 실패:", error);
  }

  return (
    <>
      {/* 진입을 조회로 기록한다 (KAN-332). 그리는 것 없는 클라 경계 */}
      <ArticleViewTracker articleId={articleResult.value.id} />
      <SiteHeader />
      <main>
        <PageContainer className="pt-6 pb-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ArticleMain
              article={articleResult.value}
              initialComments={initialComments}
            />
            <ArticleSidebar
              related={related}
              hot={hot}
              className="hidden lg:flex"
            />
          </div>
        </PageContainer>
      </main>
    </>
  );
}
