import { getArticles, getHotArticles } from "@plick/core/articles";
import { TEAM_FULL_NAMES } from "@plick/domain/constants";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { HotCarousel } from "@plick/ui/HotCarousel";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { PostFeed } from "@/_components/PostFeed";
import { HotCard } from "./HotCard";
import { HomeSidebar } from "./HomeSidebar";

/**
 * 데스크톱 홈 화면 본체 — GNB + 핫이슈 그리드 + 소식 리스트/사이드바 2단 (KAN-200).
 *
 * 홈(`/`)과 팀 허브(`/teams/[slug]`)가 같은 화면을 그린다 (KAN-350). 팀 허브는
 * 팀 검색어를 받아줄 크롤러블 URL이 필요해서 만들었는데, UX는 홈에서 팀 탭을
 * 고른 상태와 완전히 같아야 하므로 별도 화면을 만들지 않고 이 컴포넌트를 팀만
 * 바꿔 재사용한다. 모바일 홈과 같은 구조다.
 *
 * 소식 리스트는 `GET /api/v1/articles`의 해당 탭 첫 페이지를 여기서 미리 받아
 * 내려준다 (KAN-321). 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고,
 * 팀 탭을 바꾸는 순간부터는 클라가 이어받는다.
 *
 * 핫이슈는 `GET /api/v1/articles/hot`을 단발로 받아 모바일과 같은 캐러셀에
 * 내려준다 (KAN-324, KAN-338). 팀 탭을 골라도 핫이슈는 전체 기준 그대로이므로
 * 팀 허브에서도 같은 데이터를 그린다.
 *
 * 두 API는 서로 독립이라 병렬로 받고(`allSettled` — `all`은 하나가 reject되면
 * 멀쩡한 섹션까지 길동무가 된다), 한쪽이 실패해도 페이지 전체를 에러로
 * 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다.
 *
 * 사이드바의 실시간 인기는 전용 엔드포인트가 없어 핫이슈와 같은 데이터를
 * prop으로 내려 쓴다(KAN-338) — 추가 fetch가 없다.
 *
 * @param team 서버 렌더할 팀 필터. 홈은 전체(기본값), 팀 허브는 slug의 팀.
 *   초기 HTML에 이 팀의 기사 목록이 들어가야 크롤러가 읽는다.
 */
export async function HomeScreen({ team = "ALL" }: { team?: Filter }) {
  const [hotResult, feedResult] = await Promise.allSettled([
    getHotArticles(),
    getArticles({ team }),
  ]);

  const hot = hotResult.status === "fulfilled" ? hotResult.value : null;
  if (hotResult.status === "rejected") {
    console.error("[home] 핫이슈 로드 실패:", hotResult.reason);
  }

  let initial: InitialArticleFeed | undefined;
  if (feedResult.status === "fulfilled") {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: feedResult.value, fetchedAt: Date.now() };
  } else {
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러를 보여준다
    console.error("[home] 기사 피드 초기 로드 실패:", feedResult.reason);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-7 pb-22">
          {team !== "ALL" && (
            /* 팀 검색어 랜딩의 h1 — 화면(UX)은 홈과 같아야 해서 보이지 않게 둔다 */
            <h1 className="sr-only">{TEAM_FULL_NAMES[team]} 이적 루머</h1>
          )}
          <section>
            <h2 className="text-section text-text tracking-heading font-extrabold">
              🔥 핫이슈
            </h2>
            <div className="pt-gap-lg">
              {hot === null ? (
                <p className="text-body text-text-4 py-8 text-center">
                  핫이슈를 불러오지 못했어요.
                </p>
              ) : hot.length === 0 ? (
                <p className="text-body text-text-4 py-8 text-center">
                  아직 핫이슈가 없어요.
                </p>
              ) : (
                /* 모바일 홈과 같은 캐러셀 (KAN-338). 카드 비율만 데스크톱에서
                   aspect-video로 낮춘다 — 모바일 기하(181/131)를 1200px 컨테이너에
                   그대로 쓰면 카드가 700px 넘게 길어진다. 트랙에 최대 폭을 걸어
                   카드(트랙의 86%)가 과하게 커지는 것도 함께 막는다 */
                <div className="lg:mx-auto lg:max-w-5xl">
                  <HotCarousel cardClassName="aspect-[181/131] lg:aspect-video">
                    {hot.map((article) => (
                      <HotCard key={article.id} article={article} />
                    ))}
                  </HotCarousel>
                </div>
              )}
            </div>
          </section>

          <section className="pt-7.5">
            <h2 className="text-section text-text tracking-heading font-extrabold">
              지금 올라온 소식
            </h2>
            <div className="pt-gap-lg grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <PostFeed initial={initial} initialTeam={team} variant="news" />
              <HomeSidebar articles={hot} className="hidden lg:flex" />
            </div>
          </section>
        </PageContainer>
      </main>
    </>
  );
}
