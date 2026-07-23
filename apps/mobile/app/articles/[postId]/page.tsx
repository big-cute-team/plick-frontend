import { notFound } from "next/navigation";
import { ApiError } from "@/_apis/client";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { getArticle } from "@/_services/articles";
import type { ArticleDetail } from "@/_types/articles";
import { ArticleBody } from "./_components/ArticleBody";
import { ArticleTopBar } from "./_components/ArticleTopBar";
import { SuggestedArticles } from "./_components/SuggestedArticles";

/**
 * 모바일 기사 세부 페이지 (퍼블리싱 KAN-243, API 연결 KAN-283) — 상단바 +
 * 본문·댓글 + 하단 추천 기사. 홈 캐러셀·"지금 올라온 소식"에서 기사를 선택하면
 * 진입한다. 피그마 S1(301:4).
 *
 * 상세(`GET /api/v1/articles/{id}`)는 단발 읽기라 서버 컴포넌트 fetch로 받는다.
 * 추천 섹션은 API가 아직 없어 준비 중 자리만 둔다.
 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  let article: ArticleDetail;
  try {
    article = await getArticle(postId);
  } catch (e) {
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

  return (
    <AppShell>
      <ArticleTopBar />
      <ScrollArea className="pb-section">
        <ArticleBody article={article} />
        <SuggestedArticles />
      </ScrollArea>
    </AppShell>
  );
}
