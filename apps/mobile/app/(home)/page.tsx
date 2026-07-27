import { AppShell } from "@/_components/AppShell";
import { HomeScrollArea } from "./_components/HomeScrollArea";
import { HotCarousel } from "./_components/HotCarousel";
import { NewsFeed } from "./_components/NewsFeed";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { getArticles, getHotArticles } from "@/_services/articles";
import type { InitialArticleFeed } from "@/_types/articles";

/**
 * 홈 화면 — 핫이슈 캐러셀 + 지금 올라온 소식 리스트 (KAN-163).
 *
 * 소식 리스트는 `GET /api/v1/articles`의 전체 탭 첫 페이지를 여기서 미리 받아
 * 내려준다. 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고, 팀 탭을
 * 바꾸는 순간부터는 클라가 이어받는다 (KAN-271).
 *
 * 핫이슈 캐러셀은 `GET /api/v1/articles/hot`을 단발로 받아 그대로 내려준다
 * (KAN-282). 클라에서 이어 부를 일이 없어 서버 fetch로 끝낸다.
 *
 * 두 API는 서로 독립이라 병렬로 받고, 한쪽이 실패해도 페이지 전체를 에러로
 * 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다.
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
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[home] 기사 피드 초기 로드 실패:", feedResult.reason);
  }

  return (
    <AppShell>
      <TopBar />
      <HomeScrollArea>
        <section className="pt-3">
          <h2 className="px-edge text-body-lg text-text pb-2 font-extrabold">
            🔥 핫이슈
          </h2>
          {hot === null ? (
            <p className="text-body text-text-4 px-edge py-8 text-center">
              핫이슈를 불러오지 못했어요.
            </p>
          ) : hot.length === 0 ? (
            <p className="text-body text-text-4 px-edge py-8 text-center">
              아직 핫이슈가 없어요.
            </p>
          ) : (
            <HotCarousel articles={hot} />
          )}
        </section>

        <section className="pt-3">
          <h2 className="px-edge text-body-lg text-text pb-2 font-extrabold">
            지금 올라온 소식
          </h2>
          <NewsFeed initial={initial} />
        </section>
      </HomeScrollArea>
      <TabBar />
    </AppShell>
  );
}
