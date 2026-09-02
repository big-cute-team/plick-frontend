import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { SiteHeader } from "@/_components/SiteHeader";
import { getAccessToken } from "@/_services/session";
import { DebatesFeed } from "./DebatesFeed";

/**
 * 데스크톱 토론 리스트 화면 본체 (KAN-418, 시안 W13) — GNB + 중앙 정렬 단일
 * 컬럼(max-w-read)에 제목·부제 + 투표 카드 리스트.
 *
 * 카드를 누르면 소속 기사 상세로 간다 — 실제 투표는 기사 상세가 맡는다. BE에
 * 필터·페이지네이션이 없어 기사 목록과 달리 팀 탭도 무한스크롤도 없다.
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
    <>
      <SiteHeader />
      <main>
        <div className="max-w-read px-gutter mx-auto w-full pb-22">
          <header className="pt-7 pb-4.5">
            <h1 className="text-hero text-text tracking-heading font-extrabold">
              VS
            </h1>
            <p className="text-body text-text-3 mt-1.5 font-semibold">
              VS에 참여하고 팬들의 여론을 확인해보세요
            </p>
          </header>
          <DebatesFeed initial={initial} />
        </div>
      </main>
    </>
  );
}
