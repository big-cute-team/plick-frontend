"use client";

import { useState } from "react";
import { PostListItem, type PostListVariant } from "@/_components/PostListItem";
import { TeamFilterTabs } from "@/_components/TeamFilterTabs";
import type { FeedPost, Filter } from "@plick/domain/types";

/**
 * 팀 필터 탭 + 팀별로 걸러지는 게시물 리스트를 묶는 클라이언트 컨테이너.
 * 홈 "지금 올라온 소식"과 기사 페이지가 `variant`로 행 밀도만 바꿔 공용한다.
 *
 * @param posts - 표시할 게시물
 * @param variant - 행 변형(news=홈, article=기사)
 */
export function PostFeed({
  posts,
  variant,
}: {
  posts: FeedPost[];
  variant: PostListVariant;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const shown =
    filter === "ALL" ? posts : posts.filter((p) => p.team === filter);

  return (
    <div className="min-w-0">
      <TeamFilterTabs onChange={setFilter} />
      <div className={variant === "news" ? "pt-1.5 pb-6" : "pt-1.5"}>
        {shown.length > 0 ? (
          shown.map((post) => (
            <PostListItem key={post.id} post={post} variant={variant} />
          ))
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 소식이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}
