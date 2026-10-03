import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { getAccessToken } from "@/_services/session";
import { DebatesFeed } from "./DebatesFeed";
import { DebatesScrollArea } from "./DebatesScrollArea";

/**
 * 투표 화면 본체 (KAN-418, KAN-567 리디자인).
 *
 * 상단 바 아래에 진행 중 / 마감 탭 줄과 투표 카드 리스트가 온다. 화면 제목과
 * 안내 문구는 시안대로 뺐다(기능 설명 문구 금지). 리스트에서 바로 투표되고, 마감
 * 탭은 결과만 읽는다. BE에 필터·페이지네이션이 없어 팀 탭도 무한스크롤도 없는
 * 단순 리스트다.
 *
 * 첫 리스트는 서버에서 받아 씨앗으로 내려준다. `myVote`(내가 투표한 카드 표시)가
 * 유저별 값이라 토큰을 실어 부른다. 기사 상세와 같은 규약이다.
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
    console.error("[debates] 투표 리스트 초기 로드 실패:", error);
  }

  return (
    <AppShell>
      <TopBar />
      <DebatesScrollArea>
        {/* 페이지의 h1 — 시안에 제목이 없어 보이지 않게 둔다(크롤러·보조기술용) */}
        <h1 className="sr-only">투표</h1>
        <DebatesFeed initial={initial} />
      </DebatesScrollArea>
      <TabBar />
    </AppShell>
  );
}
