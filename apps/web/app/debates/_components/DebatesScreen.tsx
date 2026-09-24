import Link from "next/link";
import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { getAccessToken } from "@/_services/session";
import { DebatesFeed, type DebateTab } from "./DebatesFeed";
import { SiteFooter } from "@/_components/SiteFooter";
import { LiveStrip } from "@/_components/LiveStrip";
import { SideRail } from "@/_components/SideRail";

/** 탭 나열 순서와 라벨 (시안 `pollTabs`). */
const TABS: { key: DebateTab; label: string; href: string }[] = [
  { key: "open", label: "진행 중", href: "/debates" },
  { key: "closed", label: "마감", href: "/debates?tab=closed" },
];

/**
 * 데스크톱 투표 화면 본체 (KAN-418 → KAN-567 시안 투표 1064-1213행). GNB 아래
 * `minmax(0,1fr) 288px` 그리드에 제목 "투표" 22/900, 진행 중, 마감 탭 줄, 투표 목록을
 * 두고 우측 aside는 급상승과 채팅방 레일 자리다. 전에는 "VS" 제목에 안내 부제가
 * 있는 단일 컬럼이었다.
 *
 * 카드는 여기서 바로 투표한다(`DebateVoteCard`). 전에는 표시 전용 카드를 눌러 기사
 * 상세로 보냈다. BE에 필터, 페이지네이션이 없어 팀 탭도 무한스크롤도 없다. 탭의
 * 원본은 URL `?tab=`이라 링크로 그린다.
 *
 * 첫 리스트는 서버에서 받아 씨앗으로 내려준다. `myVote`(내가 투표한 카드 표시)가
 * 유저별 값이라 토큰을 실어 부른다. 기사 상세와 같은 규약이다.
 *
 * @param tab 지금 탭
 */
export async function DebatesScreen({ tab }: { tab: DebateTab }) {
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
      <LiveStrip />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-6.5 pb-12 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-11">
          <div className="min-w-0">
            <h1 className="text-section text-text-strong tracking-title pb-5 font-black">
              투표
            </h1>
            <div
              role="tablist"
              aria-label="투표 상태"
              className="border-border flex items-center gap-5 border-b"
            >
              {TABS.map(({ key, label, href }) => {
                const on = key === tab;
                return (
                  <Link
                    key={key}
                    href={href}
                    role="tab"
                    aria-selected={on}
                    className={`text-body focus-visible:outline-accent -mb-px border-b-2 pb-2.25 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      on
                        ? "border-accent text-text-strong font-bold"
                        : "hover:text-text-strong text-text-3 border-transparent font-medium"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <DebatesFeed initial={initial} tab={tab} />
          </div>
          <SideRail />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
