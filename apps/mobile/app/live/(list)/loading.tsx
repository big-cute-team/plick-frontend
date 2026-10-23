import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { ChatRoomBanner } from "@/live/_components/ChatRoomBanner";
import { MatchListSkeleton } from "@/live/_components/MatchListSkeleton";

/** 날짜 줄이 한 번에 보여 주는 칸 수. `DateStrip`의 칸 폭(`100%/7`)과 같다. */
const DAY_CELLS = 7;

/**
 * LIVE 목록의 로딩 자리 (KAN-602). 경기 목록과 순위표를 기다리는 동안 상단바,
 * 채팅방 배너(정적이라 실물), 날짜 줄 뼈대, 경기 행 뼈대를 먼저 그린다.
 *
 * 날짜 줄을 실물로 못 그리는 건 이 파일이 빌드 때 정적으로 굳기 때문이다. 오늘
 * 날짜를 여기서 계산하면 빌드한 날로 박힌다.
 *
 * 라우트 그룹 `(list)` 안에 둬 경기 상세·순위표·채팅방까지 이 뼈대로 덮지 않는다.
 * 같은 라우트 안의 날짜 이동(`?date=`)은 트랜지션이라 이 뼈대가 다시 뜨지 않는다.
 */
export default function LiveLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea restoreLanding={false}>
        <ChatRoomBanner />
        <div aria-hidden className="px-edge animate-pulse pt-4">
          <div className="bg-elevate rounded-pill mb-2 h-3.5 w-20" />
          <div className="flex shadow-[inset_0_-1px_0_var(--color-border)]">
            {Array.from({ length: DAY_CELLS }, (_, i) => (
              <div
                key={i}
                className="flex w-[calc(100%/7)] flex-col items-center gap-1.5 pt-2 pb-2.75"
              >
                <div className="bg-elevate rounded-pill h-3 w-4" />
                <div className="bg-elevate rounded-pill h-4.5 w-5" />
              </div>
            ))}
          </div>
        </div>
        <MatchListSkeleton />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
