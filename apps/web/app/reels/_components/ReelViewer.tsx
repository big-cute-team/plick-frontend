import type { FeedPost } from "@/_lib/types";
import { ReelCard } from "./ReelCard";

/**
 * 릴 세로 스냅 뷰어 — 릴 한 장 = 뷰포트(헤더 제외) 높이, 위아래로 스냅 스크롤.
 *
 * 순수 CSS 스크롤 스냅이라 클라이언트 로직 없이 서버 컴포넌트로 둔다.
 * 배경은 미디어 배경 토큰(레터박스 영역).
 *
 * @param posts - 피드에 표시할 게시물
 */
export function ReelViewer({ posts }: { posts: FeedPost[] }) {
  return (
    <main className="bg-media-stage flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
      {posts.map((post) => (
        <section
          key={post.id}
          className="lg:px-gutter flex h-full snap-start items-center justify-center px-4 py-8 lg:py-10"
        >
          <ReelCard post={post} />
        </section>
      ))}
    </main>
  );
}
