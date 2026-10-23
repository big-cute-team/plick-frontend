import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getArticle, getRelatedArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getArticleDebate } from "@plick/core/debates";
import { truncateText } from "@plick/domain/format";
import { newsArticleJsonLd } from "@plick/domain/jsonld";
import type { ArticleCard, Debate } from "@plick/domain/types";
import { JsonLd } from "@plick/ui/JsonLd";
import { AdSlot } from "@/_components/AdSlot";
import { LiveStrip } from "@/_components/LiveStrip";
import { PageContainer } from "@/_components/PageContainer";
import { SideRail } from "@/_components/SideRail";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import { SkyscraperAd } from "@/_components/SkyscraperAd";
import {
  MOBILE_ALTERNATE_MEDIA,
  MOBILE_SITE_URL,
  SITE_URL,
} from "@/_constants/site";
import { RELATED_ARTICLES_COUNT } from "@/_constants/app";

/**
 * 상세를 한 렌더에 한 번만 받는다 (KAN-584). `generateMetadata`와 페이지 본문이 같은 기사를
 * 각각 부르면 상세 API가 두 번 나가고 서버는 그때마다 `article_opened`를 센다. KAN-667부터는
 * 둘 다 익명이라 Next의 fetch 중복 제거로도 한 번이 되지만, 어느 쪽이 토큰을 다시 싣게 되더라도
 * 한 번으로 남게 React `cache`로 묶어 둔다.
 */
const loadArticle = cache((postId: string) => getArticle(postId));

/**
 * 익명 ISR (KAN-667, 모바일 KAN-664·ADR 0200). 이 페이지는 누구에게나 같은 것(본문, 좋아요 수,
 * 투표 집계)만 서버에서 받고, 사람마다 다른 것(내 좋아요·투표, 댓글의 내 좋아요와 차단 가림)은
 * 브라우저가 뜬 뒤 받는다. 데이터 fetch가 모두 익명 60초 캐시라 페이지도 60초다. 수(좋아요·
 * 댓글·표)가 화면에 보여서 더 길게 잡지 않았다.
 */
export const revalidate = 60;

/**
 * 빈 목록이라도 선언해야 `[postId]`가 요청마다 렌더(ƒ)가 아니라 첫 요청에 그려 캐시(●)된다
 * (인물·선수 프로필과 같은 이유). 기사는 수가 많고 계속 늘어 빌드 때 미리 그리지 않는다.
 */
export function generateStaticParams(): { postId: string }[] {
  return [];
}

/**
 * 기사별 고유 메타데이터 (KAN-346) — 기사 하나하나가 롱테일 검색어의 랜딩이라
 * title·description·OG가 페이지마다 달라야 한다. 이 URL이 canonical이고, 같은
 * 콘텐츠의 모바일 기사 URL을 alternate로 선언한다(별도 모바일 URL 패턴).
 *
 * 상세는 본문과 같은 호출(`loadArticle`)을 나눠 쓴다. 없는 기사는 빈 메타데이터로 두면
 * 페이지 본문이 notFound()로 떨어진다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  try {
    const article = await loadArticle(postId);
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
 * 받는다. 토큰 없이 받아 페이지 전체를 ISR로 캐시한다(KAN-667, ADR 0200). 내 좋아요·투표는
 * 좋아요 버튼과 투표 카드가 내 상태 캐시에서 얹는다.
 *
 * 댓글은 서버에서 받지 않는다. 전에는 첫 페이지를 같은 렌더에서 받아 씨앗으로 심었는데,
 * 댓글 응답에는 내가 누른 좋아요와 내가 차단한 작성자의 가림이 섞여 있어 익명 캐시에 넣을
 * 수 없다. 목록 훅이 브라우저에서 받는다(토큰은 프록시가 싣는다).
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

  const [articleResult, debateResult] = await Promise.allSettled([
    loadArticle(postId),
    // 투표형 게시물인지는 이 호출이 판별한다 (KAN-418) — 토론 없는 기사는 null이 온다
    getArticleDebate(postId),
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

  // 토론 조회만 실패하면 페이지를 죽이지 않고 투표 카드 없이 내려보낸다
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
        <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <ArticleMain
              article={articleResult.value}
              related={related}
              debate={debate}
            />
            {/* 광고 (KAN-652) — 댓글 아래, 푸터 위 가로 배너 */}
            <AdSlot placement="bottomBanner" className="mt-8.5" />
          </div>
          <SideRail />
        </PageContainer>
        <SkyscraperAd />
        <SiteFooter />
      </main>
    </>
  );
}
