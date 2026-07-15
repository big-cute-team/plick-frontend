import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { HOT_POSTS, NEWS_POSTS, NOTIF_COUNT } from "@/_lib/mock";
import { HotIssueGrid } from "./_components/HotIssueGrid";
import { HomeSidebar } from "./_components/HomeSidebar";
import { NewsFeed } from "./_components/NewsFeed";

/** 데스크톱 홈 — GNB + 핫이슈 그리드 + 소식 리스트/사이드바 2단 (KAN-200). */
export default function HomePage() {
  return (
    <>
      <SiteHeader notif={NOTIF_COUNT} />
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
              <NewsFeed posts={NEWS_POSTS} />
              <HomeSidebar className="hidden lg:flex" />
            </div>
          </section>
        </PageContainer>
      </main>
    </>
  );
}
