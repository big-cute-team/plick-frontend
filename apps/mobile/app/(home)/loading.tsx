import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { PredictionSectionSkeleton } from "./_components/PredictionSectionSkeleton";
import { NewsSectionSkeleton } from "./_components/NewsSectionSkeleton";

/** 홈과 팀 허브의 승부예측 카드·기사 로딩 자리. 투표는 띠(KAN-710)라 자리를 잡지 않는다. */
export default function HomeLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea restoreLanding={false}>
        <PredictionSectionSkeleton />
        <NewsSectionSkeleton />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
