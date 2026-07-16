import { notFound } from "next/navigation";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { NOTIF_COUNT, POSTS, TRENDING_POSTS } from "@/_lib/mock";
import { ArticleMain } from "./_components/ArticleMain";
import { ArticleSidebar } from "./_components/ArticleSidebar";
import { SuggestedArticles } from "./_components/SuggestedArticles";

/**
 * 데스크톱 기사 세부 페이지 (KAN-233) — GNB + 본문 컬럼 + 우측 사이드바(관련·인기)
 * + 하단 "함께 보면 좋은 기사" 행. 홈·기사 목록에서 기사를 선택하면 진입한다.
 * 피그마 W11(node 293-2).
 *
 * 데스크톱은 본문(1fr) + 사이드바(320px) 2열, `lg` 미만에선 사이드바를 숨기고
 * 본문 1열로 스택한다(홈과 동일한 반응형 규칙).
 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = POSTS.find((p) => p.id === postId);
  if (!post) notFound();

  const others = POSTS.filter((p) => p.id !== post.id);

  return (
    <>
      <SiteHeader notif={NOTIF_COUNT} />
      <main>
        <PageContainer className="pt-6 pb-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ArticleMain post={post} />
            <ArticleSidebar
              related={others.slice(0, 4)}
              trending={TRENDING_POSTS}
              className="hidden lg:flex"
            />
          </div>
          <SuggestedArticles posts={others.slice(0, 3)} />
        </PageContainer>
      </main>
    </>
  );
}
