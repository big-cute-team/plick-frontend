import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { PredictionSectionSkeleton } from "./_components/PredictionSectionSkeleton";
import { NewsSectionSkeleton } from "./_components/NewsSectionSkeleton";

/** 홈과 팀 허브의 참여 카드·기사 로딩 자리. */
export default function HomeLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea restoreLanding={false}>
        <PredictionSectionSkeleton />
        <PredictionSectionSkeleton title="투표" />
        <NewsSectionSkeleton />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
