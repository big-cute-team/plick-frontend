import { AppShell, ScrollArea } from "./_components/AppShell";
import { HotCarousel } from "./_components/HotCarousel";
import { NewsFeed } from "./_components/NewsFeed";
import { TabBar } from "./_components/TabBar";
import { TopBar } from "./_components/TopBar";
import { HOT_POSTS, NEWS_POSTS } from "./_lib/mock";

export default function HomePage() {
  return (
    <AppShell>
      <TopBar notif={3} />
      <ScrollArea className="pb-4">
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
          <NewsFeed posts={NEWS_POSTS} />
        </section>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
