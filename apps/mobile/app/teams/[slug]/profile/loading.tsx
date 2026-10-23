import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { TabBar } from "@/_components/TabBar";

/**
 * 팀 프로필 로딩 자리 (KAN-604). 팀 API 넷과 순위표(외부 데이터라 느릴 수 있다)를 기다리는
 * 동안 하위 바와 머리(엠블럼 64, 이름), 숫자 상자, 다음 경기 상자 실루엣을 먼저 그린다.
 * 엠블럼을 누르는 순간 화면이 넘어가게 하려는 것이다(KAN-602와 같은 이유).
 */
export default function TeamProfileLoading() {
  return (
    <AppShell>
      <SubTopBar title="팀" backHref="/" backBehavior="back" />
      <ScrollArea restoreLanding={false}>
        <div aria-hidden className="px-edge animate-pulse">
          <div className="flex items-center gap-4 pt-5 pb-4">
            <div className="bg-avatar size-16 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="bg-elevate rounded-pill h-6.5 w-28" />
              <div className="bg-elevate rounded-pill h-3.5 w-48" />
            </div>
          </div>
          <div className="bg-elevate-2 rounded-card h-24" />
          <div className="bg-elevate-2 rounded-card mt-2.5 h-15" />
        </div>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
