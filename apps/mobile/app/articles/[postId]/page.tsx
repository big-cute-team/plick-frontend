import { notFound } from "next/navigation";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { getPost, POSTS } from "@/_lib/mock";
import { ArticleBody } from "./_components/ArticleBody";
import { ArticleTopBar } from "./_components/ArticleTopBar";
import { SuggestedArticles } from "./_components/SuggestedArticles";

/**
 * 모바일 기사 세부 페이지 (KAN-243) — 상단바 + 본문·댓글 + 하단 추천 기사.
 * 홈 "지금 올라온 소식" 리스트에서 기사를 선택하면 진입한다. 피그마 S1(301:4).
 *
 * 라우팅·구성은 데스크톱 세부(`apps/web`)를 참고했고, 공용 조각은 `@plick/ui`를
 * 그대로 재사용한다(별도 승격 없이 기존 아이콘·MediaThumb·ReporterTierBadge·
 * 모바일 CommentThread로 충족).
 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = getPost(postId);
  if (!post) notFound();

  const related = POSTS.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <AppShell>
      <ArticleTopBar saved={post.saved} />
      <ScrollArea className="pb-section">
        <ArticleBody post={post} />
        <SuggestedArticles posts={related} />
      </ScrollArea>
    </AppShell>
  );
}
