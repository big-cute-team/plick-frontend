import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";

/** MY 로딩 스켈레톤 — 프로필 fetch(`GET /users/me`) 동안 카드 자리를 잡아둔다. */
export default function MyLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea>
        <div className="px-edge gap-gap-lg flex animate-pulse flex-col pt-3 pb-8">
          <div className="bg-elevate rounded-card h-21.5" />
          <div className="bg-elevate rounded-card h-14" />
          <div className="bg-elevate rounded-card h-28" />
          <div className="bg-elevate rounded-card h-14" />
        </div>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
