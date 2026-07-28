import { getArticles } from "@plick/core/articles";
import type { InitialArticleFeed } from "@plick/domain/types";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { HOT_POSTS } from "@/_mocks/posts";
import { PostFeed } from "@/_components/PostFeed";
import { HotIssueGrid } from "./_components/HotIssueGrid";
import { HomeSidebar } from "./_components/HomeSidebar";

/**
 * 데스크톱 홈 — GNB + 핫이슈 그리드 + 소식 리스트/사이드바 2단 (KAN-200).
 *
 * 소식 리스트는 `GET /api/v1/articles`의 전체 탭 첫 페이지를 여기서 미리 받아
 * 내려준다 (KAN-321). 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고,
 * 팀 탭을 바꾸는 순간부터는 클라가 이어받는다. 서버에서 못 받아도 페이지 전체를
 * 에러로 떨어뜨리지 않고 클라가 다시 받아 리스트 자리에만 에러를 보여준다.
 *
 * 핫이슈 그리드·사이드바는 아직 목데이터다 — 각각 `articles/hot` 이식 티켓과
 * 계약 공백(실시간 인기) 확정 몫.
 */
export default async function HomePage() {
  let initial: InitialArticleFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: await getArticles(), fetchedAt: Date.now() };
  } catch (error) {
    console.error("[home] 기사 피드 초기 로드 실패:", error);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-7 pb-22">
          <section>
            <h2 className="text-section text-text tracking-heading font-extrabold">
              🔥 핫이슈
            </h2>
            <div className="pt-gap-lg">
              <HotIssueGrid posts={HOT_POSTS} />
            </div>
          </section>

          <section className="pt-7.5">
            <h2 className="text-section text-text tracking-heading font-extrabold">
              지금 올라온 소식
            </h2>
            <div className="pt-gap-lg grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <PostFeed initial={initial} variant="news" />
              <HomeSidebar className="hidden lg:flex" />
            </div>
          </section>
        </PageContainer>
      </main>
    </>
  );
}
