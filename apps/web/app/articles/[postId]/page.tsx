import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticle, getRelatedArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getComments } from "@plick/core/comments";
import { getArticleDebate } from "@plick/core/debates";
import { truncateText } from "@plick/domain/format";
import { newsArticleJsonLd } from "@plick/domain/jsonld";
import type {
  ArticleCard,
  Debate,
  InitialCommentPage,
} from "@plick/domain/types";
import { JsonLd } from "@plick/ui/JsonLd";
import { LiveStrip } from "@/_components/LiveStrip";
import { PageContainer } from "@/_components/PageContainer";
import { SideRail } from "@/_components/SideRail";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import {
  MOBILE_ALTERNATE_MEDIA,
  MOBILE_SITE_URL,
  SITE_URL,
} from "@/_constants/site";
import { RELATED_ARTICLES_COUNT } from "@/_constants/app";
import { getAccessToken } from "@/_services/session";

/**
 * 기사별 고유 메타데이터 (KAN-346) — 기사 하나하나가 롱테일 검색어의 랜딩이라
 * title·description·OG가 페이지마다 달라야 한다. 이 URL이 canonical이고, 같은
 * 콘텐츠의 모바일 기사 URL을 alternate로 선언한다(별도 모바일 URL 패턴).
 *
 * 본문 렌더와 별개로 상세를 한 번 더 부르지만, 메타데이터는 유저 무관이라
 * 토큰 없이 부른다 — 익명 fetch는 같은 렌더 안에서 중복 제거되고, 토큰을
 * 실으면 오히려 no-store라 두 번 나간다. 없는 기사는 빈 메타데이터로 두면
 * 페이지 본문이 notFound()로 떨어진다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  try {
    const article = await getArticle(postId);
    const description = truncateText(article.summary, 160);
    return {
      title: article.title,
      description,
      alternates: {
        canonical: `/articles/${article.id}`,
        media: {
          [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/articles/${article.id}`,
        },
      },
      openGraph: {
        title: article.title,
        description,
        type: "article",
        publishedTime: article.publishedAt,
        // 동적 OG (KAN-351). 파일 컨벤션 자동 배선 대신 라우트 핸들러 URL을
        // 명시한다 — 이유는 `og/route.tsx` 참고
        images: [
          {
            url: `/articles/${article.id}/og`,
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ],
      },
    };
  } catch {
    return {};
  }
}
import { ArticleMain } from "./_components/ArticleMain";
import { ArticleViewTracker } from "./_components/ArticleViewTracker";

/**
 * 데스크톱 기사 세부 페이지 (퍼블리싱 KAN-233, API 연결 KAN-322, 댓글 KAN-329,
 * 시안 KAN-567 "기사 상세") — 상단 바, LIVE 띠, 본문 컬럼(관련 기사·댓글 포함),
 * 우측 레일(급상승), 푸터. 홈·기사 목록에서 기사를 선택하면 진입한다.
 *
 * 데스크톱은 홈과 같은 본문(1fr) + 레일(288px) 2열, `lg` 미만에선 레일을 숨기고
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
 * 관련 기사는 기사의 팀태그가 필요해 상세를 받은 뒤 이어 받는다
 * (`getRelatedArticles` — 팀 필터 목록에서 자기 자신을 거르고 4개, 시안의 관련
 * 기사 칸 수). 실패해도 기사 본문은 떠야 해서 그 섹션 자리에만 실패를 보여준다.
 * KAN-563에서 웹 관련 기사를 뺐었는데 시안이 본문 밑 "관련 기사" 2열을 그려
 * 모바일 `suggested`와 같은 데이터로 되살렸다. 실시간 급상승은 KAN-501에서
 * 레일이 스스로 받게 바뀌어 이 페이지가 손대지 않는다.
 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const accessToken = await getAccessToken();

  const [articleResult, commentsResult, debateResult] =
    await Promise.allSettled([
      getArticle(postId, accessToken),
      getComments(postId, { accessToken }),
      // 투표형 게시물인지는 이 호출이 판별한다 (KAN-418) — 토론 없는 기사는
      // null이 온다. 토큰을 실어야 `myVote`가 이 유저 기준으로 온다
      getArticleDebate(postId, accessToken ? { accessToken } : undefined),
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

  // 토론 조회만 실패하면 페이지를 죽이지 않고 투표 카드 없이 내려보낸다 —
  // 댓글 씨앗과 같은 판단이다
  const debate: Debate | null =
    debateResult.status === "fulfilled" ? debateResult.value : null;
  if (debateResult.status === "rejected") {
    console.error("[article] 토론 로드 실패:", debateResult.reason);
  }

  // 관련 기사는 기사의 팀태그가 필요해 상세를 받은 뒤 이어 받는다
  let related: ArticleCard[] | null = null;
  try {
    related = await getRelatedArticles(
      articleResult.value.id,
      articleResult.value.teams,
      RELATED_ARTICLES_COUNT,
    );
  } catch (error) {
    console.error("[article] 관련 기사 로드 실패:", error);
  }

  return (
    <>
      {/* 기사 리치 결과용 NewsArticle 구조화 데이터 (KAN-351) */}
      <JsonLd
        data={newsArticleJsonLd({
          article: articleResult.value,
          canonicalUrl: `${SITE_URL}/articles/${articleResult.value.id}`,
          imageUrl: `${SITE_URL}/articles/${articleResult.value.id}/og`,
          siteUrl: SITE_URL,
          logoUrl: `${SITE_URL}/icon.png`,
        })}
      />
      {/* 진입을 조회로 기록한다 (KAN-332). 그리는 것 없는 클라 경계 */}
      <ArticleViewTracker articleId={articleResult.value.id} />
      <SiteHeader />
      <LiveStrip />
      <main>
        <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_288px]">
          <ArticleMain
            article={articleResult.value}
            related={related}
            initialComments={initialComments}
            debate={debate}
          />
          <SideRail />
        </PageContainer>
        <SiteFooter />
      </main>
    </>
  );
}
