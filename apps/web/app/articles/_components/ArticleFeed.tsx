"use client";

import { useState } from "react";
import { TeamFilterTabs } from "@/_components/TeamFilterTabs";
import type { FeedPost, Filter } from "@/_lib/types";
import { ArticleItem } from "./ArticleItem";

/**
 * 기사 페이지 본문 — 팀 필터 탭 + 팀별로 걸러지는 기사 리스트를 묶는 클라이언트 컨테이너.
 */
export function ArticleFeed({ posts }: { posts: FeedPost[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const shown =
    filter === "ALL" ? posts : posts.filter((p) => p.team === filter);

  return (
    <div className="min-w-0">
      <TeamFilterTabs onChange={setFilter} />
      <div className="pt-1.5">
        {shown.length > 0 ? (
          shown.map((post) => <ArticleItem key={post.id} post={post} />)
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 소식이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}
