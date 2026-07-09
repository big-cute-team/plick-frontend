"use client";

import { useState } from "react";
import type { FeedPost } from "@/_lib/types";
import type { Filter } from "@/(home)/_lib/types";
import { NewsItem } from "./NewsItem";
import { TeamFilterTabs } from "./TeamFilterTabs";

/**
 * "지금 올라온 소식" 섹션 — 팀 필터 + 리스트를 묶어 필터링까지 동작시키는
 * 클라이언트 컨테이너.
 */
export function NewsFeed({ posts }: { posts: FeedPost[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const shown =
    filter === "ALL" ? posts : posts.filter((p) => p.team === filter);

  return (
    <>
      <TeamFilterTabs onChange={setFilter} />
      <div className="px-edge">
        {shown.length > 0 ? (
          shown.map((post) => <NewsItem key={post.id} post={post} />)
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 소식이 없어요.
          </p>
        )}
      </div>
    </>
  );
}
