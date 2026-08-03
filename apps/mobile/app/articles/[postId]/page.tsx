import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticle, getRelatedArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getComments } from "@plick/core/comments";
import { truncateText } from "@plick/domain/format";
import type { ArticleCard, InitialCommentPage } from "@plick/domain/types";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { getAccessToken } from "@/_services/session";

/**
 * 기사별 고유 메타데이터 (KAN-346) — 기사 하나하나가 롱테일 검색어의 랜딩이라
 * title·description·OG가 페이지마다 달라야 한다. canonical은 같은 콘텐츠의
 * 데스크톱 기사 URL이다(별도 모바일 URL 패턴).
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
      alternates: { canonical: `${WEB_SITE_URL}/articles/${article.id}` },
      openGraph: {
        title: article.title,
        description,
        type: "article",
        publishedTime: article.publishedAt,
      },
    };
  } catch {
    return {};
  }
}
import { ArticleBody } from "./_components/ArticleBody";
import { ArticleTopBar } from "./_components/ArticleTopBar";
import { ArticleViewTracker } from "./_components/ArticleViewTracker";

/**
 * 모바일 기사 세부 페이지 (퍼블리싱 KAN-243, API 연결 KAN-283, 댓글 KAN-303) —
 * 상단바 + 본문(추천 기사 포함)·댓글. 홈 캐러셀·"지금 올라온 소식"에서 기사를
 * 선택하면 진입한다. 피그마 S1(301:4).
 *
 * 상세(`GET /api/v1/articles/{id}`)는 단발 읽기라 서버 컴포넌트 fetch로 받는다.
 * 댓글 첫 페이지도 같은 렌더에서 병렬로 받아 클라 캐시의 씨앗으로 심는다 —
 * 안 심으면 목록 훅이 마운트되자마자 같은 페이지를 또 받는다(이중 페치).
 * 댓글 fetch만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다 — 목록이
 * 클라에서 다시 받으면서 에러·재시도를 보여준다.
 *
 * 진입 자체는 조회로 기록한다(KAN-310) — 서버 렌더가 아니라 브라우저에 마운트된
 * 뒤에 보낸다({@link ArticleViewTracker}).
 *
 * 본문 밑 "함께 보면 좋은 기사"(KAN-301)는 KAN-338에서 채웠다. 전용 추천 API
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

  // 토큰을 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다
  // (기사 KAN-308, 댓글 KAN-309)
  const accessToken = await getAccessToken();
  const [articleResult, commentsResult] = await Promise.allSettled([
    getArticle(postId, accessToken),
    getComments(postId, { accessToken }),
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

  const initialComments: InitialCommentPage | undefined =
    commentsResult.status === "fulfilled"
      ? { page: commentsResult.value, fetchedAt: Date.now() }
      : undefined;

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
      {/* 진입을 조회로 기록한다 (KAN-310). 그리는 것 없는 클라 경계 */}
      <ArticleViewTracker articleId={articleResult.value.id} />
      <ArticleTopBar />
      <ScrollArea className="pb-section">
        <ArticleBody
          article={articleResult.value}
          suggested={suggested}
          initialComments={initialComments}
        />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
