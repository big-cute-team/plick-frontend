"use client";

import { useState } from "react";
import type { Filter } from "@plick/domain/types";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import type { ArticleFeedPage } from "@/_types/articles";
import { NewsItem } from "./NewsItem";
import { NewsItemSkeleton } from "./NewsItemSkeleton";
import { TeamFilterTabs } from "./TeamFilterTabs";

/** 로딩 중 보여줄 자리 개수 — 한 페이지 건수보다 적게 둬 화면을 덜 채운다. */
const SKELETON_COUNT = 4;

/**
 * "지금 올라온 소식" 섹션 — 팀 필터 + 리스트.
 *
 * 필터는 화면에서 거르지 않고 BE `teamId`로 넘겨 팀별 최신순 목록을 새로 받는다
 * (KAN-271). 전체 탭 첫 페이지는 서버가 미리 받아 `initial`로 내려주므로 첫
 * 렌더에는 스켈레톤이 보이지 않는다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 전체 탭 첫 페이지. 서버 fetch가
 *   실패했으면 없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를 보여준다.
 */
export function NewsFeed({ initial }: { initial?: ArticleFeedPage }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const { data, isPending, isError, refetch, isFetching } = useArticleFeed(
    filter,
    initial,
  );

  return (
    <>
      <TeamFilterTabs value={filter} onChange={setFilter} />
      <div className="px-edge">
        {isPending ? (
          Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <NewsItemSkeleton key={i} />
          ))
        ) : isError ? (
          <div className="py-12 text-center">
            <p className="text-body text-text-4">소식을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-elevate text-label text-text rounded-control mt-3 px-4 py-2 font-bold active:opacity-70 disabled:opacity-50"
            >
              다시 시도
            </button>
          </div>
        ) : data.items.length > 0 ? (
          data.items.map((article) => (
            <NewsItem key={article.id} article={article} />
          ))
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 소식이 없어요.
          </p>
        )}
      </div>
    </>
  );
}
