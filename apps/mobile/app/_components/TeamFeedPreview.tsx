"use client";

import type { Filter } from "@plick/domain/types";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import { NewsItem } from "@/_components/NewsItem";
import { NewsItemSkeleton } from "@/_components/NewsItemSkeleton";

/**
 * 좌우 스와이프 중 옆에서 끌려 들어오는 이웃 팀 리스트의 미리보기 (KAN-388).
 *
 * 진짜 피드와 같은 쿼리(`useArticleFeed`)를 그대로 구독한다 — 캐시에 있으면
 * 즉시 실물 리스트가 보이고, 없으면 마운트가 곧 프리페치라 드래그하는 동안
 * 받아 온다(도착하면 구독이라 스켈레톤이 실물로 바뀐다). 커밋 후 갈아 끼워질
 * 진짜 페인도 같은 캐시를 그리므로 교체 순간 픽셀이 이어진다.
 *
 * 에러는 여기서 그리지 않는다 — 드래그 중 잠깐 보이는 페인에 재시도 버튼은
 * 의미가 없고, 커밋되면 진짜 페인이 에러와 재시도를 맡는다.
 *
 * @param team 미리 보여줄 이웃 팀
 * @param skeletonCount 캐시가 없을 때 깔 스켈레톤 개수. 커밋 직후 진짜 페인이
 *   보여줄 개수와 같아야 교체 순간 리스트가 튀지 않는다.
 * @param limit 보여줄 최대 건수. 홈은 첫 페이지 고정이라 진짜 페인과 같게
 *   자르고, 기사 페이지는 저장 스크롤 깊이까지 이어져야 해서 자르지 않는다.
 */
export function TeamFeedPreview({
  team,
  skeletonCount,
  limit,
}: {
  team: Filter;
  skeletonCount: number;
  limit?: number;
}) {
  const { data, isPending } = useArticleFeed(team);

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const shown = limit == null ? items : items.slice(0, limit);

  return (
    <div className="px-edge">
      {isPending || (shown.length === 0 && !data) ? (
        Array.from({ length: skeletonCount }, (_, i) => (
          <NewsItemSkeleton key={i} />
        ))
      ) : shown.length > 0 ? (
        shown.map((article) => (
          <NewsItem key={article.id} article={article} filter={team} />
        ))
      ) : (
        <p className="text-body text-text-4 py-12 text-center">
          아직 이 팀 소식이 없어요.
        </p>
      )}
    </div>
  );
}
