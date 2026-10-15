import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { TabBar } from "@/_components/TabBar";

/**
 * 선수 프로필 로딩 자리 (KAN-604). 프로필, 경기, 시즌별 기록(외부 데이터라 느릴 수 있다)을
 * 기다리는 동안 하위 바와 머리(사진 96, 이름), 신상 2열, 숫자 상자 실루엣을 먼저 그린다.
 * 선수단 행을 누르는 순간 화면이 넘어가게 하려는 것이다(KAN-602와 같은 이유).
 */
export default function PlayerProfileLoading() {
  return (
    <AppShell>
      <SubTopBar title="선수" backHref="/" backBehavior="back" />
      <ScrollArea restoreLanding={false}>
        <div aria-hidden className="px-edge animate-pulse">
          <div className="flex items-center gap-4 pt-5 pb-4.5">
            <div className="bg-chip rounded-card size-24 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="bg-elevate rounded-badge h-5.5 w-20" />
              <div className="bg-elevate rounded-pill h-6.5 w-36" />
              <div className="bg-elevate rounded-pill h-3.5 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pb-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="bg-elevate rounded-pill h-3 w-12" />
                <div className="bg-elevate rounded-pill h-4 w-24" />
              </div>
            ))}
          </div>
          <div className="bg-elevate-2 rounded-card h-20" />
        </div>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
