import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { getAccessToken } from "@/_services/session";
import { DebatesFeed } from "./DebatesFeed";
import { DebatesScrollArea } from "./DebatesScrollArea";

/**
 * 토론 리스트 화면 본체 (KAN-418, 시안 T1).
 *
 * 열려 있는 투표형 게시물을 리스트로 보여주고, 카드를 누르면 소속 기사 상세로
 * 간다 — 실제 투표는 기사·릴에서 한다. BE에 필터·페이지네이션이 없어 기사
 * 목록과 달리 팀 탭도 무한스크롤도 없는 단순 리스트다.
 *
 * 첫 리스트는 서버에서 받아 씨앗으로 내려준다. `myVote`(내가 투표한 카드 표시)가
 * 유저별 값이라 토큰을 실어 부른다 — 기사 상세와 같은 규약이다.
 */
export async function DebatesScreen() {
  let initial: InitialDebateList | undefined;
  try {
    const accessToken = await getAccessToken();
    initial = {
      items: await getDebates(accessToken ? { accessToken } : undefined),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[debates] 토론 리스트 초기 로드 실패:", error);
  }

  return (
    <AppShell>
      <TopBar />
      <DebatesScrollArea>
        <header className="px-edge pt-3 pb-2">
          <h1 className="text-section tracking-heading text-text font-extrabold">
            토론
          </h1>
          <p className="text-caption text-text-4 mt-1 font-semibold">
            투표로 팬들의 여론을 확인해보세요
          </p>
        </header>
        <DebatesFeed initial={initial} />
      </DebatesScrollArea>
      <TabBar />
    </AppShell>
  );
}
