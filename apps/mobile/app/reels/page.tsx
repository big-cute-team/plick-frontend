import { AppShell } from "@/_components/AppShell";
import { ReelsFeed } from "./_components/ReelsFeed";
import { TabBar } from "@/_components/TabBar";
import { getReels } from "@/_services/reels";
import type { InitialReelFeed } from "@/_types/reels";

/**
 * 릴스 화면 (KAN-167) — 풀스크린 미디어 위에 탭바를 오버레이로 얹는다.
 *
 * 첫 페이지는 `GET /api/v1/reels`로 여기서 미리 받아 내려준다. 클라가 같은 데이터를
 * 또 부르는 이중 페치를 막는 씨앗이고, 끝에 가까워지면 클라가 커서로 이어받는다 (KAN-276).
 */
export default async function ReelsPage() {
  let initial: InitialReelFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    const page = await getReels();
    initial = { page, fetchedAt: Date.now() };
  } catch (e) {
    // 서버에서 못 받아도 페이지 전체를 에러로 떨어뜨리지 않는다.
    // 클라가 다시 받아 릴 자리에 에러와 재시도 버튼을 보여준다.
    console.error("[reels] 릴스 피드 초기 로드 실패:", e);
  }

  return (
    <AppShell>
      <ReelsFeed initial={initial} />
      <TabBar variant="overlay" />
    </AppShell>
  );
}
