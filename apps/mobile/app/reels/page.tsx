import { AppShell } from "../_components/AppShell";
import { ReelsFeed } from "./_components/ReelsFeed";
import { TabBar } from "../_components/TabBar";
import { POSTS } from "../_lib/mock";

/** 릴스 화면 (KAN-167) — 풀스크린 미디어 위에 탭바를 오버레이로 얹는다. */
export default function ReelsPage() {
  return (
    <AppShell>
      <ReelsFeed posts={POSTS} />
      <TabBar variant="overlay" />
    </AppShell>
  );
}
