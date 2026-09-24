import { getArticles } from "@plick/core/articles";
import { formatChatTime } from "@plick/domain/format";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { FeedPullRefresh } from "@/_components/FeedPullRefresh";
import { LiveStrip } from "@/_components/LiveStrip";
import { PageContainer } from "@/_components/PageContainer";
import { PostFeed } from "@/_components/PostFeed";
import { SideRail } from "@/_components/SideRail";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 데스크톱 기사 화면 본체 (KAN-207, 시안 KAN-567) — 홈과 같은 2열(표 + 우측 레일)에
 * 홈의 "새로 올라온 이슈" 표를 무한 스크롤로 끝까지 잇는다. 전에는 `max-w-read`
 * 단일 컬럼에 제목·부제 + 팀 탭 + 카드 행이었다. 시안에 기사 목록 화면은 따로
 * 없어 홈 표를 전폭으로 이어 그리는 것으로 정했다.
 *
 * 기사 목록(`/articles`)과 팀별 기사(`/articles/teams/[slug]`)가 같은 화면을
 * 그린다 (KAN-350) — 팀 탭 선택이 URL로 남아야 새로고침·공유가 그 팀 그대로다.
 * 홈의 팀 허브와 같은 판단이고, 화면은 팀만 바꿔 재사용한다.
 *
 * 리스트는 홈과 같은 `GET /api/v1/articles`를 소비한다 (KAN-321). 해당 탭
 * 첫 페이지를 서버에서 미리 받아 씨앗으로 내려주고, 쿼리키가 홈과 같아
 * 홈에서 이미 받았으면 캐시를 그대로 이어 쓴다.
 *
 * @param team 서버 렌더할 팀 필터. 기사 목록은 전체(기본값), 팀별 기사는 slug의 팀.
 */
export async function ArticlesScreen({ team = "ALL" }: { team?: Filter }) {
  let initial: InitialArticleFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: await getArticles({ team }), fetchedAt: Date.now() };
  } catch (error) {
    console.error("[articles] 기사 피드 초기 로드 실패:", error);
  }
  const renderedAt = formatChatTime(new Date().toISOString());

  return (
    <>
      <SiteHeader />
      <LiveStrip />
      <main>
        {/* 좁은 화면에서 맨 위를 당기면 새로고침 (KAN-379). sticky인 SiteHeader는
            transform 껍데기 밖에 둬야 해서 본문만 감싼다 */}
        <FeedPullRefresh surface="article">
          <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_288px]">
            <section className="min-w-0">
              <div className="flex items-baseline gap-2.5 pb-1.5">
                <h1 className="text-body-lg text-text-strong font-black tracking-tight">
                  이슈
                </h1>
                <span className="text-caption-lg text-text-3">
                  {renderedAt} 갱신
                </span>
                <div aria-hidden className="flex-1" />
                {/* 정렬 API가 없어 최신순 하나만 굳혀 둔다 */}
                <span className="text-label-lg text-text-strong font-bold">
                  최신순
                </span>
              </div>
              <PostFeed
                initial={initial}
                initialTeam={team}
                variant="article"
              />
            </section>
            <SideRail />
          </PageContainer>
        </FeedPullRefresh>
        <SiteFooter />
      </main>
    </>
  );
}
