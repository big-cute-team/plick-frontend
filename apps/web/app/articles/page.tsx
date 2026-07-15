import { SiteHeader } from "@/_components/SiteHeader";
import { NOTIF_COUNT, POSTS } from "@/_lib/mock";
import { ArticleFeed } from "./_components/ArticleFeed";

/**
 * 데스크톱 기사 페이지 (KAN-207) — GNB + 중앙 정렬 단일 컬럼(max-w-read)에
 * 제목·부제 + 팀 필터 탭 + 팀별 이적 기사 리스트. 피그마 W10(node 222-2).
 */
export default function ArticlesPage() {
  return (
    <>
      <SiteHeader notif={NOTIF_COUNT} />
      <main>
        <div className="max-w-read px-gutter mx-auto w-full pt-7 pb-22">
          <header>
            <h1 className="text-hero text-text tracking-heading font-extrabold">
              기사
            </h1>
            <p className="text-body text-text-3 mt-1.5 font-semibold">
              팀별 이적 소식을 모아보세요
            </p>
          </header>
          <div className="pt-4.5">
            <ArticleFeed posts={POSTS} />
          </div>
        </div>
      </main>
    </>
  );
}
