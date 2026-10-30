import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getArticle, getRelatedArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getArticleDebate } from "@plick/core/debates";
import { TEAMS } from "@plick/domain/constants";
import { truncateText } from "@plick/domain/format";
import { newsArticleJsonLd } from "@plick/domain/jsonld";
import type { ArticleCard, Debate } from "@plick/domain/types";
import { JsonLd } from "@plick/ui/JsonLd";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { WEB_SITE_URL } from "@/_constants/site";

/**
 * 상세를 한 렌더에 한 번만 받는다 (KAN-584). `generateMetadata`와 페이지 본문이 같은 기사를
 * 각각 부르면 상세 API가 두 번 나가고 서버는 그때마다 `article_opened`를 센다. KAN-664부터는
 * 둘 다 익명이라 Next의 fetch 중복 제거로도 한 번이 되지만, 어느 쪽이 토큰을 다시 싣게 되더라도
 * 한 번으로 남게 React `cache`로 묶어 둔다.
 */
const loadArticle = cache((postId: string) => getArticle(postId));

/**
 * 익명 ISR (KAN-664). 이 페이지는 누구에게나 같은 것(본문, 좋아요 수, 투표 집계)만 서버에서
 * 받고, 사람마다 다른 것(내 좋아요·투표, 댓글의 내 좋아요와 차단 가림)은 브라우저가 뜬 뒤 받는다.
 * 데이터 fetch가 모두 익명 60초 캐시라 페이지도 60초다. 수(좋아요·댓글·표)가 화면에 보여서
 * 더 길게 잡지 않았다.
 */
export const revalidate = 60;

/**
 * 빈 목록이라도 선언해야 `[postId]`가 요청마다 렌더(ƒ)가 아니라 첫 요청에 그려 캐시(●)된다
 * (ADR 0199 인물·선수 프로필과 같은 이유). 기사는 수가 많고 계속 늘어 빌드 때 미리 그리지 않는다.
 */
export function generateStaticParams(): { postId: string }[] {
  return [];
}

/**
 * 기사별 고유 메타데이터 (KAN-346) — 공유 카드(OG)와 브라우저 탭 제목이
 * 페이지마다 달라야 한다. 색인은 KAN-652에서 뺐다(아래 robots). canonical은 같은 콘텐츠의
 * 데스크톱 기사 URL이다(별도 모바일 URL 패턴).
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
      // 색인 제외 (KAN-652). 본문이 원문 트윗 한두 문장의 요약이라 검색 엔진이 복제·자동 생성
      // 콘텐츠로 묶는다(애드센스 "가치가 별로 없는 콘텐츠" 거절). 링크는 따라가게 둬 팀 허브와
      // 인물 페이지로 가는 크롤 경로는 유지한다. 공유·OG·JSON-LD는 그대로다
      robots: { index: false, follow: true },
      alternates: { canonical: `${WEB_SITE_URL}/articles/${article.id}` },
      openGraph: {
        title: article.title,
        description,
        type: "article",
        publishedTime: article.publishedAt,
        // 동적 OG는 canonical 도메인(web)이 렌더한다 (KAN-351) — 자산을 두 앱에
        // 중복 커밋하지 않고, 어느 도메인에서 공유돼도 같은 카드가 나온다
        images: [
          {
            url: `${WEB_SITE_URL}/articles/${article.id}/og`,
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
import { ArticleBody } from "./_components/ArticleBody";
import { ArticleScrollArea } from "./_components/ArticleScrollArea";
import { ArticleTopBar } from "./_components/ArticleTopBar";
import { ArticleViewTracker } from "./_components/ArticleViewTracker";

/**
 * 모바일 기사 세부 페이지 (퍼블리싱 KAN-243, API 연결 KAN-283, 댓글 KAN-303) —
 * 상단바 + 본문·댓글·추천 기사. 홈 캐러셀·"지금 올라온 소식"에서 기사를
 * 선택하면 진입한다. 피그마 S1(301:4).
 *
 * 상세(`GET /api/v1/articles/{id}`)는 단발 읽기라 서버 컴포넌트 fetch로 받는다.
 * 토큰 없이 받아 페이지 전체를 ISR로 캐시한다(KAN-664, ADR 0200). 내 좋아요·투표는
 * 좋아요 버튼과 투표 카드가 내 상태 캐시에서 얹는다.
 *
 * 댓글은 서버에서 받지 않는다. 전에는 첫 페이지를 같은 렌더에서 받아 씨앗으로 심었는데,
 * 댓글 응답에는 내가 누른 좋아요와 내가 차단한 작성자의 가림이 섞여 있어 익명 캐시에 넣을
 * 수 없다. 목록 훅이 브라우저에서 받는다(토큰은 프록시가 싣는다).
 *
 * 진입 자체는 조회로 기록한다(KAN-310) — 서버 렌더가 아니라 브라우저에 마운트된
 * 뒤에 보낸다({@link ArticleViewTracker}).
 *
 * 댓글 밑 "함께 보면 좋은 기사"(KAN-301, 위치 KAN-676)는 KAN-338에서 채웠다. 전용 추천 API
 * 대신 기사의 팀태그로 팀 필터 목록을 받아 자기 자신을 거르고 5개를 보여준다
 * (`getRelatedArticles`). 팀태그가 필요해 상세를 받은 뒤 이어 받고, 실패해도
 * 본문은 떠야 해서 빈 목록으로 둔다 — 섹션이 빈 문구를 그린다.
 *
 * 하단 탭바를 여기에도 둔다 (KAN-314). 기사를 읽다가 릴스나 MY로 바로 건너뛰려면
 * 상단 뒤로가기로 홈까지 나갔다 다시 눌러야 했다. 이 화면에서는 어느 탭도 활성이
 * 아니므로(경로가 `/articles/…`라 `TABS`의 `match`가 전부 false다) 셋 다 평범한
 * 이동이고, 홈을 누르면 두고 온 목록이 그 자리 그대로 되살아난다.
 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  const [articleResult, debateResult] = await Promise.allSettled([
    loadArticle(postId),
    // 투표형 게시물인지는 이 호출이 판별한다 — 토론 없는 기사는 null이 온다
    getArticleDebate(postId),
  ]);

  if (articleResult.status === "rejected") {
    const e = articleResult.reason;
    // 없는 id·미발행 기사(404)와 정수가 아닌 id(400)는 삭제된 딥링크나
    // 손으로 친 주소의 정상 경로다 — 에러 화면이 아니라 not-found로 보낸다
    if (
      e instanceof ApiError &&
      (e.code === "ARTICLE_NOT_FOUND" || e.code === "COMMON_INVALID_PARAM")
    ) {
      notFound();
    }
    throw e;
  }

  // 토론 조회만 실패하면 페이지를 죽이지 않고 투표 카드 없이 내려보낸다
  const debate: Debate | null =
    debateResult.status === "fulfilled" ? debateResult.value : null;
  if (debateResult.status === "rejected") {
    console.error("[article] 토론 로드 실패:", debateResult.reason);
  }

  // 함께 보면 좋은 기사 — 팀태그가 필요해 상세를 받은 뒤 이어 받는다
  let suggested: ArticleCard[] = [];
  try {
    suggested = await getRelatedArticles(
      articleResult.value.id,
      articleResult.value.teams,
    );
  } catch (error) {
    console.error("[article] 함께 보면 좋은 기사 로드 실패:", error);
  }

  return (
    <AppShell>
      {/* NewsArticle 구조화 데이터 (KAN-351) — 데스크톱과 같은 값을 싣고 URL도
          canonical 도메인 기준이다(구글 별도 모바일 URL 가이드) */}
      <JsonLd
        data={newsArticleJsonLd({
          article: articleResult.value,
          canonicalUrl: `${WEB_SITE_URL}/articles/${articleResult.value.id}`,
          imageUrl: `${WEB_SITE_URL}/articles/${articleResult.value.id}/og`,
          siteUrl: WEB_SITE_URL,
          logoUrl: `${WEB_SITE_URL}/icon.png`,
        })}
      />
      {/* 진입을 조회로 기록한다 (KAN-310). 그리는 것 없는 클라 경계 */}
      <ArticleViewTracker articleId={articleResult.value.id} />
      {/* 상단바 제목은 `{팀명} 이슈` (KAN-567) — 대표 팀은 첫 팀이다 */}
      <ArticleTopBar
        teamName={
          articleResult.value.teams[0]
            ? TEAMS[articleResult.value.teams[0]].name
            : null
        }
        articleId={articleResult.value.id}
      />
      {/* 당겨서 새로고침 (KAN-681) — 투표 집계·댓글은 브라우저가, 나머지는 서버 갱신 */}
      <ArticleScrollArea articleId={articleResult.value.id}>
        <ArticleBody
          article={articleResult.value}
          suggested={suggested}
          debate={debate}
        />
      </ArticleScrollArea>
      <TabBar />
    </AppShell>
  );
}
