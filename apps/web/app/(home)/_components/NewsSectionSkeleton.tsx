import { ARTICLES_PAGE_SIZE } from "@plick/core/articles";
import { PostListItemSkeleton } from "@/_components/PostListItemSkeleton";
import { PostTableHead } from "@/_components/PostTableHead";

/**
 * "새로 올라온 이슈" 섹션의 로딩 자리 (KAN-602). 제목과 표 머리는 실물, 팀 탭 줄은
 * 칩 자리, 표는 `PostFeed`가 첫 페이지를 기다릴 때와 같은 개수의 행 스켈레톤이다.
 */
export function NewsSectionSkeleton() {
  return (
    <section aria-hidden className="mt-8.5">
      <h2 className="text-body-lg text-text-strong pb-1.5 font-black tracking-tight">
        새로 올라온 이슈
      </h2>
      <div className="border-border flex h-8 animate-pulse items-center gap-3.75 border-b">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="bg-elevate h-3.5 w-10" />
        ))}
      </div>
      <PostTableHead />
      {Array.from({ length: ARTICLES_PAGE_SIZE }, (_, i) => (
        <PostListItemSkeleton key={i} />
      ))}
    </section>
  );
}
