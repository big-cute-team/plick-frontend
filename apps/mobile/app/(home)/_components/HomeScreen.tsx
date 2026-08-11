import { AppShell } from "@/_components/AppShell";
import { HotCarousel } from "@plick/ui/HotCarousel";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { getArticles, getHotArticles } from "@plick/core/articles";
import { homeIntroCopy } from "@plick/domain/brand";
import { TEAMS, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { teamCollectionJsonLd } from "@plick/domain/jsonld";
import { JsonLd } from "@plick/ui/JsonLd";
import { WEB_SITE_URL } from "@/_constants/site";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { HomeScrollArea } from "./HomeScrollArea";
import { HotHeroCard } from "./HotHeroCard";
import { NewsFeed } from "./NewsFeed";

/**
 * 홈 화면 본체 — 핫이슈 캐러셀 + 지금 올라온 소식 리스트 (KAN-163).
 *
 * 홈(`/`)과 팀 허브(`/teams/[slug]`)가 같은 화면을 그린다 (KAN-350). 팀 허브는
 * "토트넘 이적 루머" 같은 팀 검색어를 받아줄 크롤러블 URL이 필요해서 만들었는데,
 * UX는 홈에서 팀 탭을 고른 상태와 완전히 같아야 하므로 별도 화면을 만들지 않고
 * 이 컴포넌트를 팀만 바꿔 재사용한다.
 *
 * 소식 리스트는 `GET /api/v1/articles`의 해당 탭 첫 페이지를 여기서 미리 받아
 * 내려준다. 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고, 팀 탭을
 * 바꾸는 순간부터는 클라가 이어받는다 (KAN-271).
 *
 * 핫이슈 캐러셀은 `GET /api/v1/articles/hot`을 단발로 받아 그대로 내려준다
 * (KAN-282). 홈에서 팀 탭을 골라도 핫이슈는 전체 기준 그대로이므로 팀 허브에서도
 * 같은 데이터를 그린다. 클라에서 이어 부를 일이 없어 서버 fetch로 끝낸다.
 *
 * 두 API는 서로 독립이라 병렬로 받고, 한쪽이 실패해도 페이지 전체를 에러로
 * 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다.
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
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[home] 기사 피드 초기 로드 실패:", feedResult.reason);
  }

  return (
    <AppShell>
      <TopBar />
      <HomeScrollArea>
        {/* 페이지의 h1 — 화면(UX)은 홈과 같아야 해서 양쪽 다 보이지 않게 둔다.
            팀 허브는 팀 검색어, 홈은 브랜드·카테고리 검색어를 받는 랜딩이다 (KAN-380) */}
        <h1 className="sr-only">
          {team !== "ALL"
            ? `${TEAM_FULL_NAMES[team]} 이적 루머`
            : "플릭 PLick 프리미어리그 이적 루머와 소식"}
        </h1>

        {team !== "ALL" && (
          /* 팀 허브 CollectionPage 구조화 데이터 (KAN-351) — 데스크톱과 같은
             값을 싣고 URL도 canonical 도메인 기준이다 */
          <JsonLd
            data={teamCollectionJsonLd({
              teamFullName: TEAM_FULL_NAMES[team],
              url: `${WEB_SITE_URL}/teams/${TEAMS[team].slug}`,
              siteUrl: WEB_SITE_URL,
              articles: initial?.page.items ?? [],
            })}
          />
        )}
        <section className="pt-3">
          <h2 className="px-edge text-section tracking-heading text-text pb-2 font-extrabold">
            🔥 핫이슈
          </h2>
          {hot === null ? (
            <p className="text-body text-text-4 px-edge py-8 text-center">
              핫이슈를 불러오지 못했어요.
            </p>
          ) : hot.length === 0 ? (
            <p className="text-body text-text-4 px-edge py-8 text-center">
              아직 핫이슈가 없어요.
            </p>
          ) : (
            <HotCarousel>
              {hot.map((article) => (
                <HotHeroCard key={article.id} article={article} />
              ))}
            </HotCarousel>
          )}
        </section>

        <section className="pt-3">
          <h2 className="px-edge text-section tracking-heading text-text pb-2 font-extrabold">
            지금 올라온 소식
          </h2>
          <NewsFeed initial={initial} initialTeam={team} />
        </section>

        {/* 크롤러블 서비스 소개 (KAN-384) — 홈 본문에 서비스 설명 텍스트가
            없으면 구글이 description을 버리고 탭바·빈 상태 문구를 긁어
            스니펫을 만든다. description과 겹치는 문장을 화면에 싣는다 */}
        <section className="px-edge pt-6 pb-4">
          <p className="text-caption text-text-4">
            {homeIntroCopy(team !== "ALL" ? TEAM_FULL_NAMES[team] : undefined)}
          </p>
        </section>
      </HomeScrollArea>
      <TabBar />
    </AppShell>
  );
}
