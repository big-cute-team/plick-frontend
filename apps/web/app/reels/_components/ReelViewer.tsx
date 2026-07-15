"use client";

import type { FeedPost } from "@/_lib/types";
import { ReelCard } from "./ReelCard";

/**
 * 릴 세로 스냅 뷰어 — 릴 한 장 = 뷰포트(헤더 제외) 높이, 위아래로 스냅 스크롤.
 *
 * 배경은 미디어 배경 토큰(레터박스 영역). 세부 패널이 열리면 옆에서 폭을 나눠 갖는다
 * (`ReelsWorkspace`가 뷰어·패널을 가로로 배치) — 릴 카드는 `w-auto`라 폭에 맞춰 줄어든다.
 *
 * @param posts - 피드에 표시할 게시물
 * @param onOpenDetail - 제목·댓글 클릭 시 해당 게시물의 세부 패널을 여는 콜백
 */
export function ReelViewer({
  posts,
  onOpenDetail,
}: {
  posts: FeedPost[];
  onOpenDetail: (post: FeedPost) => void;
}) {
  return (
    <main className="bg-media-stage min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
      {posts.map((post) => (
        <section
          key={post.id}
          className="lg:px-gutter flex h-full snap-start items-center justify-center px-4 py-8 lg:py-10"
        >
          <ReelCard post={post} onOpenDetail={() => onOpenDetail(post)} />
        </section>
      ))}
    </main>
  );
}
