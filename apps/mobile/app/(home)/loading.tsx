import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { HotSectionSkeleton } from "./_components/HotSectionSkeleton";
import { NewsSectionSkeleton } from "./_components/NewsSectionSkeleton";

/**
 * 홈과 팀 허브(`/teams/[slug]`)의 로딩 자리 (KAN-602). 페이지가 BE 조회를 기다리는
 * 동안 상단바와 탭바는 실물로, 핫이슈 상자와 소식 리스트는 뼈대로 먼저 그린다.
 * 탭을 누르는 순간 화면이 바뀌고 활성 탭 표시도 따라온다. 이게 없으면 BE가 느릴 때
 * 응답이 올 때까지 옛 화면이 그대로 멈춰 있다.
 *
 * LIVE·VS 띠는 없는 날과 같게 비워 둔다. 있는 날이면 내용이 오면서 위에 끼어든다.
 */
export default function HomeLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea>
        <HotSectionSkeleton />
        <NewsSectionSkeleton />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
