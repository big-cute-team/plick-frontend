import { AppShell } from "@/_components/AppShell";
import { HotCarousel } from "@plick/ui/HotCarousel";
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
import { HotFlame } from "@plick/ui/HotFlame";
import { LiveDot } from "@plick/ui/LiveDot";
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
 * 핫이슈는 `GET /api/v1/articles/hot`을 단발로 받는다 (KAN-282). 홈에서 팀 탭을
 * 골라도 핫이슈는 전체 기준 그대로이므로 팀 허브에서도 같은 데이터를 그린다.
 * 클라에서 이어 부를 일이 없어 서버 fetch로 끝낸다.
 *
 * 응답이 원문 사진 유무로 갈린 두 목록이라(KAN-480, BE는 KAN-487) 화면도 둘로
 * 나뉜다. 사진 있는 기사는 캐러셀이 한 화면에 두 장씩 받고, 사진 없는 기사는
 * 그 아래에서 텍스트 카드를 한 장씩 스와이프로 넘긴다 (KAN-515). 사진 없는
 * 기사를 캐러셀에 넣으면 원문 트윗 임베드로 칸을 메워야 했는데, 임베드는 로드가
 * 느리고 높이가 제멋대로라 캐러셀에서 가장 말썽이었다.
 *
 * 핫이슈 위에는 오늘 경기·진행 중 투표 배너가 조건부로 선다 (KAN-504). 홈에
 * 들어온 사람이 "오늘 경기 있나", "투표할 거 있나"를 탭을 옮겨 보지 않아도 되게
 * 하는 통로다. 둘 다 그날 있을 때만 그려지고, 판정과 문구는 각 배너가 갖는다.
 *
 * 네 API는 서로 독립이라 병렬로 받고, 한쪽이 실패해도 페이지 전체를 에러로
 * 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다. 배너 둘은 실패해도 자리를
 * 남기지 않는다 — 부가 정보라 없는 날과 같이 처리하는 게 맞다.
 *
 * @param team 서버 렌더할 팀 필터. 홈은 전체(기본값), 팀 허브는 slug의 팀.
 *   초기 HTML에 이 팀의 기사 목록이 들어가야 크롤러가 읽는다.
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
     없는 날과 똑같이 보이고, 그게 맞는 처리다(TodayMatchBanner 주석) */
  const matches = matchResult.status === "fulfilled" ? matchResult.value : [];
  if (matchResult.status === "rejected") {
    console.error("[home] 오늘 경기 로드 실패:", matchResult.reason);
  }
  const debates = debateResult.status === "fulfilled" ? debateResult.value : [];
  if (debateResult.status === "rejected") {
    console.error("[home] 토론 리스트 로드 실패:", debateResult.reason);
  }
  /* 캐러셀 칸은 사진이 주인공이라, 대표 이미지가 빈 카드는 원문 게시물의
     제일 큰 사진으로 메운다 (KAN-484) */
  const heroes = hot ? await withTweetPhotos(hot.withImage) : [];
  // BE는 그룹마다 5건까지 주는데 캐러셀 아래 텍스트 카드는 세 장으로 정해져 있다
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
        {/* 오늘 경기·진행 중 투표 배너 (KAN-504) — 있을 때만 핫이슈 위에 선다.
            둘 다 null인 날은 이 div가 자식 없는 :empty가 되는데, 그때도 pt-3만큼
            빈 띠가 남으므로 `empty:hidden`으로 상자째 지운다 */}
        <div className="px-edge flex flex-col gap-2 pt-3 empty:hidden">
          <TodayMatchBanner matches={matches} />
          <OpenDebateBanner debates={debates} />
        </div>

        {/* 핫이슈 전체(제목·사진 캐러셀·텍스트 페이저)를 연한 테두리 상자에 담는다
            (KAN-525). 아래 "지금 올라온 소식"과 한 면에 이어져 어디까지가
            핫이슈인지 흐렸다. 상자 안 좌우 여백은 화면 여백(px-edge)보다 좁은
            px-3이고, 화면 여백은 상자 밖 section이 맡는다 */}
        <section className="px-edge pt-3">
          <div className="border-border rounded-card border py-3">
            {/* 불꽃이 번쩍여 "지금 올라온 소식"처럼 살아 있는 섹션으로 읽힌다 (KAN-515) */}
            <h2 className="text-section tracking-heading text-text flex items-center gap-2 px-3 pb-2 font-extrabold">
              <HotFlame />
              핫이슈
            </h2>
            {hot === null ? (
              <p className="text-body text-text-4 px-3 py-8 text-center">
                핫이슈를 불러오지 못했어요.
              </p>
            ) : heroes.length === 0 && noImage.length === 0 ? (
              <p className="text-body text-text-4 px-3 py-8 text-center">
                아직 핫이슈가 없어요.
              </p>
            ) : (
              <>
                {heroes.length > 0 && (
                  /* 한 화면에 두 장을 왼쪽 정렬로 깐다 (KAN-515). 좌우 여백은
                     트랙 밖 px-3(상자 안 여백)이 맡고 `--hot-edge`는 0으로
                     덮는다 — 웹 홈이 네 장을 까는 방식과 같다. 두 장 이상
                     보이면 캐러셀이 스스로 자동 넘김과 점을 끄고 핸들로 두 장씩
                     넘긴다 */
                  <HotCarousel
                    className="px-3 [--hot-edge:0px]"
                    slideClassName="w-[calc((100%-10px)/2)] snap-start aspect-[6/5]"
                  >
                    {heroes.map((article, i) => (
                      <HotHeroCard
                        key={article.id}
                        article={article}
                        fetchPriority={i < 2 ? "high" : "low"}
                      />
                    ))}
                  </HotCarousel>
                )}
                {noImage.length > 0 && (
                  <HotTextPager>
                    {noImage.map((article) => (
                      <HotTextCard key={article.id} article={article} />
                    ))}
                  </HotTextPager>
                )}
              </>
            )}
          </div>
        </section>

        <section className="pt-3">
          <div className="px-edge flex items-center justify-between pb-2">
            {/* 빨간 점이 번쩍여 지금 갱신되는 목록임을 알린다 (KAN-481) */}
            <h2 className="text-section tracking-heading text-text flex items-center gap-2 font-extrabold">
              <LiveDot />
              지금 올라온 소식
            </h2>
            {/* 첫 페이지 밖 기사는 기사 페이지가 맡는다 (KAN-386) */}
            <MoreArticlesLink variant="header" />
          </div>
          <NewsFeed initial={initial} initialTeam={team} />
        </section>

        {/* 크롤러블 서비스 소개 (KAN-384) — 홈 본문에 서비스 설명 텍스트가
            없으면 구글이 description을 버리고 탭바·빈 상태 문구를 긁어
            스니펫을 만든다. description과 겹치는 문장을 화면에 싣는다.
            팀 탭 전환을 따라가야 해서 클라 컴포넌트다 */}
        <HomeIntro />

        {/* SEO 푸터 (KAN-386 후속) — 홈 리스트가 유한해져 생긴 바닥에 내부 링크를 모은다 */}
        <HomeFooter />
      </HomeScrollArea>
      <TabBar />
    </AppShell>
  );
}
