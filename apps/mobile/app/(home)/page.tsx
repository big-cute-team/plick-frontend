import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { HotCarousel } from "./_components/HotCarousel";
import { NewsFeed } from "./_components/NewsFeed";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { getArticles } from "@/_services/articles";
import type { ArticleFeedPage } from "@/_types/articles";
import { HOT_POSTS } from "@/_mocks/posts";

/**
 * 홈 화면 — 핫이슈 캐러셀 + 지금 올라온 소식 리스트 (KAN-163).
 *
 * 소식 리스트는 `GET /api/v1/articles`의 전체 탭 첫 페이지를 여기서 미리 받아
 * 내려준다. 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고, 팀 탭을
 * 바꾸는 순간부터는 클라가 이어받는다 (KAN-271).
 *
 * 핫이슈 캐러셀은 아직 목데이터다. BE에 인기·정렬 개념이 없어 근거가 될 값이
 * 없다 — 조회수 API가 붙을 때 함께 연결한다.
 */
export default async function HomePage() {
  let initial: ArticleFeedPage | undefined;
  try {
    initial = await getArticles();
  } catch (e) {
    // 서버에서 못 받아도 페이지 전체를 에러로 떨어뜨리지 않는다.
    // 클라가 다시 받아 리스트 자리에만 에러와 재시도 버튼을 보여준다.
    console.error("[home] 기사 피드 초기 로드 실패:", e);
  }

  return (
    <AppShell>
      <TopBar notif={3} />
      <ScrollArea className="pb-section">
        <section className="pt-3">
          <h2 className="px-edge text-body-lg text-text pb-2 font-extrabold">
            🔥 핫이슈
          </h2>
          <HotCarousel posts={HOT_POSTS} />
        </section>

        <section className="pt-3">
          <h2 className="px-edge text-body-lg text-text pb-2 font-extrabold">
            지금 올라온 소식
          </h2>
          <NewsFeed initial={initial} />
        </section>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
