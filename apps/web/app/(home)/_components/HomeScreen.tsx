import {
  HOT_NO_IMAGE_COUNT,
  getArticles,
  getHotArticles,
} from "@plick/core/articles";
import { withTweetPhotos } from "@plick/core/tweet-media";
import { TEAMS, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { teamCollectionJsonLd } from "@plick/domain/jsonld";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { HotCarousel } from "@plick/ui/HotCarousel";
import { HotFlame } from "@plick/ui/HotFlame";
import { JsonLd } from "@plick/ui/JsonLd";
import { LiveDot } from "@plick/ui/LiveDot";
import { FeedPullRefresh } from "@/_components/FeedPullRefresh";
import { MoreArticlesLink } from "@/_components/MoreArticlesLink";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { SITE_URL } from "@/_constants/site";
import { PostFeed } from "@/_components/PostFeed";
import { HotCard } from "./HotCard";
import { HotTextCard } from "./HotTextCard";
import { HomeFooter } from "./HomeFooter";
import { HomeIntro } from "./HomeIntro";
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
 * 핫이슈는 `GET /api/v1/articles/hot`을 단발로 받는다 (KAN-324, KAN-338). 팀 탭을
 * 골라도 핫이슈는 전체 기준 그대로이므로 팀 허브에서도 같은 데이터를 그린다.
 *
 * 응답이 원문 사진 유무로 갈린 두 목록이라(KAN-480, BE는 KAN-487) 화면도 둘로
 * 나뉜다. 사진 있는 기사는 캐러셀이 받는데 데스크톱에서는 카드를 4분의 1로
 * 줄여 네 장이 한 화면에 들어간다 — 1200px 폭에 카드 한 장을 띄우면 히어로가
 * 아니라 배너가 되고, 그 아래 리스트가 첫 화면 밖으로 밀린다. 사진 없는 기사는
 * 그 아래 3열 그리드에 텍스트 카드로 깐다. 사진 없는 기사를 캐러셀에 넣으면
 * 원문 트윗 임베드로 칸을 메워야 했는데, 임베드는 로드가 느리고 높이가
 * 제멋대로라 캐러셀에서 가장 말썽이었다.
 *
 * 두 API는 서로 독립이라 병렬로 받고(`allSettled` — `all`은 하나가 reject되면
 * 멀쩡한 섹션까지 길동무가 된다), 한쪽이 실패해도 페이지 전체를 에러로
 * 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다.
 *
 * 사이드바의 실시간 급상승은 자기 데이터를 스스로 받는다 (KAN-501) — 이 화면이
 * 넘겨줄 게 없어 `Suspense` 경계 안에서 따로 흐른다.
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
  /* 캐러셀 칸은 사진이 주인공이라, 대표 이미지가 빈 카드는 원문 게시물의
     제일 큰 사진으로 메운다 (KAN-484) */
  const heroes = hot ? await withTweetPhotos(hot.withImage) : [];
  // BE는 그룹마다 5건까지 주는데 캐러셀 아래는 세 칸으로 정해져 있다
  const noImage = hot?.withoutImage.slice(0, HOT_NO_IMAGE_COUNT) ?? [];

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
        {/* 좁은 화면에서 맨 위를 당기면 새로고침 (KAN-379). sticky인 SiteHeader는
            transform 껍데기 밖에 둬야 해서 본문만 감싼다 */}
        <FeedPullRefresh surface="news">
          <PageContainer className="pt-7 pb-22">
            {/* 페이지의 h1 — 화면(UX)은 홈과 같아야 해서 양쪽 다 보이지 않게 둔다.
                팀 허브는 팀 검색어, 홈은 브랜드·카테고리 검색어를 받는 랜딩이다 (KAN-380) */}
            <h1 className="sr-only">
              {team !== "ALL"
                ? `${TEAM_FULL_NAMES[team]} 이적 루머`
                : "플릭 PLick 프리미어리그 이적 루머와 소식"}
            </h1>

            {team !== "ALL" && (
              /* 팀 허브 CollectionPage 구조화 데이터 (KAN-351) — 서버 렌더된
               첫 페이지 기사만 ItemList로 싣는다(크롤러가 보는 HTML과 같은 범위) */
              <JsonLd
                data={teamCollectionJsonLd({
                  teamFullName: TEAM_FULL_NAMES[team],
                  url: `${SITE_URL}/teams/${TEAMS[team].slug}`,
                  siteUrl: SITE_URL,
                  articles: initial?.page.items ?? [],
                })}
              />
            )}
            {/* 핫이슈 전체(제목·사진 캐러셀·텍스트 그리드)를 연한 테두리 상자에
                담는다 (KAN-525, 모바일 홈과 같다). 아래 "지금 올라온 소식"과 한
                면에 이어져 어디까지가 핫이슈인지 흐렸다 */}
            <section className="border-border rounded-card border p-5">
              {/* 불꽃이 번쩍여 "지금 올라온 소식"처럼 살아 있는 섹션으로 읽힌다 (KAN-515) */}
              <h2 className="text-section text-text tracking-heading flex items-center gap-2 font-extrabold">
                <HotFlame />
                핫이슈
              </h2>
              <div className="pt-gap-lg">
                {hot === null ? (
                  <p className="text-body text-text-4 py-8 text-center">
                    핫이슈를 불러오지 못했어요.
                  </p>
                ) : heroes.length === 0 && noImage.length === 0 ? (
                  <p className="text-body text-text-4 py-8 text-center">
                    아직 핫이슈가 없어요.
                  </p>
                ) : (
                  <>
                    {heroes.length > 0 && (
                      /* 모바일 홈과 같은 캐러셀 (KAN-338)이지만 데스크톱에서는
                         카드를 4분의 1 폭으로 줄이고 왼쪽 정렬로 스냅시켜 네 장이
                         한 줄에 선다 (KAN-480). 폭은 간격 세 칸(30px)을 뺀 나머지를
                         넷으로 나눈 값이고, 좌우 여백(`--hot-edge`)은 0으로 덮어
                         첫 카드가 컨테이너 왼쪽 끝에 맞는다 — 가운데 스냅용 7%
                         여백을 그대로 두면 네 장이 안쪽으로 밀려 줄이 어긋난다 */
                      <HotCarousel
                        className="lg:[--hot-edge:0px]"
                        slideClassName="w-[86%] snap-center aspect-[181/131] lg:w-[calc((100%-30px)/4)] lg:snap-start"
                      >
                        {heroes.map((article, i) => (
                          <HotCard
                            key={article.id}
                            article={article}
                            fetchPriority={i < 4 ? "high" : "low"}
                          />
                        ))}
                      </HotCarousel>
                    )}
                    {noImage.length > 0 && (
                      /* 좁은 화면에서는 한 열로 쌓이고 데스크톱에서만 3열이 된다 */
                      <ul className="pt-gap-lg grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {noImage.map((article) => (
                          <li key={article.id}>
                            <HotTextCard article={article} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="pt-7.5">
              {/* 아래 리스트/사이드바 그리드와 같은 템플릿을 헤더 행에도 적용한다 —
                  더보기 링크가 컨테이너 우측 끝(사이드바 위)이 아니라 리스트 열의
                  우측 끝에 정렬되게 한다. 자식이 하나라 사이드바 열은 비어 있다 */}
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex items-center justify-between">
                  {/* 빨간 점이 번쩍여 지금 갱신되는 목록임을 알린다 (KAN-481) */}
                  <h2 className="text-section text-text tracking-heading flex items-center gap-2 font-extrabold">
                    <LiveDot />
                    지금 올라온 소식
                  </h2>
                  {/* 첫 페이지 밖 기사는 기사 페이지가 맡는다 (KAN-386) */}
                  <MoreArticlesLink variant="header" />
                </div>
              </div>
              <div className="pt-gap-lg grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
                <PostFeed initial={initial} initialTeam={team} variant="news" />
                <HomeSidebar className="hidden lg:flex" />
              </div>
            </section>

            {/* 크롤러블 서비스 소개 (KAN-384) — 홈 본문에 서비스 설명 텍스트가
                없으면 구글이 description을 버리고 탭바·빈 상태 문구를 긁어
                스니펫을 만든다. description과 겹치는 문장을 화면에 싣는다.
                팀 탭 전환을 따라가야 해서 클라 컴포넌트다 */}
            <HomeIntro />
          </PageContainer>
        </FeedPullRefresh>

        {/* SEO 푸터 — 모바일 홈과 같은 판단. 당겨서 새로고침 transform 밖에 둬
            풀 제스처에 딸려 움직이지 않는다 */}
        <HomeFooter />
      </main>
    </>
  );
}
