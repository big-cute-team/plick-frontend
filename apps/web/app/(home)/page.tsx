import { getArticles, getHotArticles } from "@plick/core/articles";
import type { InitialArticleFeed } from "@plick/domain/types";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { PostFeed } from "@/_components/PostFeed";
import { HotIssueGrid } from "./_components/HotIssueGrid";
import { HomeSidebar } from "./_components/HomeSidebar";

/**
 * 데스크톱 홈 — GNB + 핫이슈 그리드 + 소식 리스트/사이드바 2단 (KAN-200).
 *
 * 소식 리스트는 `GET /api/v1/articles`의 전체 탭 첫 페이지를 여기서 미리 받아
 * 내려준다 (KAN-321). 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고,
 * 팀 탭을 바꾸는 순간부터는 클라가 이어받는다.
 *
 * 핫이슈 그리드는 `GET /api/v1/articles/hot`을 단발로 받아 그대로 내려준다
 * (KAN-324). 클라에서 이어 부를 일이 없어 서버 fetch로 끝낸다.
 *
 * 두 API는 서로 독립이라 병렬로 받고(`allSettled` — `all`은 하나가 reject되면
 * 멀쩡한 섹션까지 길동무가 된다), 한쪽이 실패해도 페이지 전체를 에러로
 * 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다. 모바일 홈과 같은 구조다.
 *
 * 사이드바는 아직 목데이터다 — 실시간 인기는 대응 BE 엔드포인트가 없다.
 */
export default async function HomePage() {
  const [hotResult, feedResult] = await Promise.allSettled([
    getHotArticles(),
    getArticles(),
  ]);

  const hot = hotResult.status === "fulfilled" ? hotResult.value : null;
  if (hotResult.status === "rejected") {
    console.error("[home] 핫이슈 로드 실패:", hotResult.reason);
  }

  let initial: InitialArticleFeed | undefined;
  if (feedResult.status === "fulfilled") {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: feedResult.value, fetchedAt: Date.now() };
  } else {
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러를 보여준다
    console.error("[home] 기사 피드 초기 로드 실패:", feedResult.reason);
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
              {hot === null ? (
                <p className="text-body text-text-4 py-8 text-center">
                  핫이슈를 불러오지 못했어요.
                </p>
              ) : hot.length === 0 ? (
                <p className="text-body text-text-4 py-8 text-center">
                  아직 핫이슈가 없어요.
                </p>
              ) : (
                <HotIssueGrid articles={hot} />
              )}
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
