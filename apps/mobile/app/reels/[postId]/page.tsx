import { notFound } from "next/navigation";
import { AppShell } from "../../_components/AppShell";
import { ReelsFeed } from "../_components/ReelsFeed";
import { TabBar } from "../../_components/TabBar";
import { getPost, POSTS } from "../../_lib/mock";

/** 릴스 딥링크 — 해당 게시물부터 시작하는 동일 피드 (홈 핫이슈 카드가 여기로 링크). */
export default async function ReelPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  if (!getPost(postId)) notFound();
  return (
    <AppShell>
      <ReelsFeed posts={POSTS} initialPostId={postId} />
      <TabBar variant="overlay" />
    </AppShell>
  );
}
