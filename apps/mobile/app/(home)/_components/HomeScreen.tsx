import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import {
  HOT_NO_IMAGE_COUNT,
  getArticles,
  getHotArticles,
} from "@plick/core/articles";
import { getDebates } from "@plick/core/debates";
import { withTweetPhotos } from "@plick/core/tweet-media";
import { getMatches } from "@plick/core/live";
import { TEAMS, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { todayDateKeyKst } from "@plick/domain/live";
import { teamCollectionJsonLd } from "@plick/domain/jsonld";
import { JsonLd } from "@plick/ui/JsonLd";
import { WEB_SITE_URL } from "@/_constants/site";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { HomeFooter } from "./HomeFooter";
import { HomeIntro } from "./HomeIntro";
import { HomeScrollArea } from "./HomeScrollArea";
import { HotHeroCard } from "./HotHeroCard";
import { HotTextCard } from "./HotTextCard";
import { HotTextPager } from "./HotTextPager";
import { MoreArticlesLink } from "./MoreArticlesLink";
import { NewsFeed } from "./NewsFeed";
import { OpenDebateBanner } from "./OpenDebateBanner";
import { TodayMatchBanner } from "./TodayMatchBanner";

/**
 * 홈 화면 본체 (KAN-163, 시안 KAN-567 "홈") — LIVE·VS 띠, 핫이슈 상자, 지금 올라온 소식.
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
 * 핫이슈는 `GET /api/v1/articles/hot`을 단발로 받는다 (KAN-282). 응답이 원문 사진
 * 유무로 갈린 두 목록이라(KAN-480) 시안대로 사진 카드는 168px 가로 스크롤 트랙에,
 * 사진 없는 기사는 그 아래 텍스트 카드 한 장씩 점으로 넘긴다. 핫이슈 전체가 채운
 * 면(radius 16) 상자 하나다.
 *
 * 네 API는 서로 독립이라 병렬로 받고, 한쪽이 실패해도 페이지 전체를 에러로
 * 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다. 배너 둘은 실패해도 자리를
 * 남기지 않는다 — 부가 정보라 없는 날과 같이 처리하는 게 맞다.
 *
 * @param team 서버 렌더할 팀 필터. 홈은 전체(기본값), 팀 허브는 slug의 팀.
 */
export async function HomeScreen({ team = "ALL" }: { team?: Filter }) {
  const [hotResult, feedResult, matchResult, debateResult] =
    await Promise.allSettled([
      getHotArticles(),
      getArticles({ team }),
      getMatches(todayDateKeyKst()),
      getDebates(),
    ]);

  const hot = hotResult.status === "fulfilled" ? hotResult.value : null;
  if (hotResult.status === "rejected") {
    console.error("[home] 핫이슈 로드 실패:", hotResult.reason);
  }

  /* 배너 둘은 부가 정보라 실패를 빈 배열로 접는다 — 자리를 비워 두면 경기·투표가
     없는 날과 똑같이 보이고, 그게 맞는 처리다 */
  const matches = matchResult.status === "fulfilled" ? matchResult.value : [];
  if (matchResult.status === "rejected") {
    console.error("[home] 오늘 경기 로드 실패:", matchResult.reason);
  }
  const debates = debateResult.status === "fulfilled" ? debateResult.value : [];
  if (debateResult.status === "rejected") {
    console.error("[home] 토론 리스트 로드 실패:", debateResult.reason);
  }
  /* 사진 카드는 사진이 주인공이라, 대표 이미지가 빈 카드는 원문 게시물의
     제일 큰 사진으로 메운다 (KAN-484) */
  const heroes = hot ? await withTweetPhotos(hot.withImage) : [];
  // BE는 그룹마다 5건까지 주는데 텍스트 카드는 세 장으로 정해져 있다
  const noImage = hot?.withoutImage.slice(0, HOT_NO_IMAGE_COUNT) ?? [];

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
            : "해축이모 프리미어리그 이적 루머와 이슈"}
        </h1>

        {team !== "ALL" && (
          /* 팀 허브 CollectionPage 구조화 데이터 (KAN-351) */
          <JsonLd
            data={teamCollectionJsonLd({
              teamFullName: TEAM_FULL_NAMES[team],
              url: `${WEB_SITE_URL}/teams/${TEAMS[team].slug}`,
              siteUrl: WEB_SITE_URL,
              articles: initial?.page.items ?? [],
            })}
          />
        )}

        {/* LIVE·VS 띠 (KAN-504) — 있을 때만 핫이슈 위에 선다. 둘 다 null인 날은
            `empty:hidden`으로 상자째 지운다 */}
        <div className="px-edge flex flex-col gap-2 pt-3 empty:hidden">
          <TodayMatchBanner matches={matches} />
          <OpenDebateBanner debates={debates} />
        </div>

        {/* 핫이슈 상자 — 채운 면 하나에 제목·사진 카드 트랙·텍스트 카드 페이저 */}
        <section className="px-edge pt-3">
          <div className="bg-elevate-2 rounded-card py-3.25">
            <h2 className="text-body-lg text-text-strong tracking-section px-3 pb-2.5 font-black">
              핫이슈
            </h2>
            {hot === null ? (
              <p className="text-body text-text-4 px-3 py-8 text-center">
                핫이슈를 불러오지 못했어요
              </p>
            ) : heroes.length === 0 && noImage.length === 0 ? (
              <p className="text-body text-text-4 px-3 py-8 text-center">
                아직 핫이슈가 없어요
              </p>
            ) : (
              <>
                {heroes.length > 0 && (
                  <div className="snap-x-carousel no-scrollbar flex gap-2.5 overflow-x-auto px-3 pb-3">
                    {heroes.map((article, i) => (
                      <HotHeroCard
                        key={article.id}
                        article={article}
                        rank={i}
                        fetchPriority={i < 2 ? "high" : "low"}
                      />
                    ))}
                  </div>
                )}
                {noImage.length > 0 && (
                  <HotTextPager>
                    {/* 순위는 사진 카드 뒤에 이어 붙는다 — 핫이슈 응답 순서 그대로 (KAN-543) */}
                    {noImage.map((article, i) => (
                      <HotTextCard
                        key={article.id}
                        article={article}
                        rank={heroes.length + i}
                      />
                    ))}
                  </HotTextPager>
                )}
              </>
            )}
          </div>
        </section>

        <section className="pt-5">
          <div className="px-edge flex items-baseline justify-between pb-2">
            <h2 className="text-body-lg text-text-strong tracking-section font-black">
              지금 올라온 소식
            </h2>
            {/* 첫 페이지 밖 기사는 기사 페이지가 맡는다 (KAN-386) */}
            <MoreArticlesLink variant="header" />
          </div>
          <NewsFeed initial={initial} initialTeam={team} />
        </section>

        {/* 크롤러블 서비스 소개 (KAN-384) */}
        <HomeIntro />

        {/* SEO 푸터 (KAN-386 후속) */}
        <HomeFooter />
      </HomeScrollArea>
      <TabBar />
    </AppShell>
  );
}
