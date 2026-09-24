import {
  HOT_NO_IMAGE_COUNT,
  getArticles,
  getHotArticles,
} from "@plick/core/articles";
import { getMatches } from "@plick/core/live";
import { withTweetPhotos } from "@plick/core/tweet-media";
import { TEAMS, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { formatChatTime } from "@plick/domain/format";
import { todayDateKeyKst } from "@plick/domain/live";
import { teamCollectionJsonLd } from "@plick/domain/jsonld";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { JsonLd } from "@plick/ui/JsonLd";
import { FeedPullRefresh } from "@/_components/FeedPullRefresh";
import { LiveStrip } from "@/_components/LiveStrip";
import { PageContainer } from "@/_components/PageContainer";
import { PostFeed } from "@/_components/PostFeed";
import { SideRail } from "@/_components/SideRail";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import { HOT_CARD_COUNT } from "@/_constants/app";
import { SITE_URL } from "@/_constants/site";
import { HomeIntro } from "./HomeIntro";
import { HotCard } from "./HotCard";

/**
 * 데스크톱 홈 화면 본체 (KAN-200, 시안 KAN-567 "홈") — 상단 바, LIVE 띠, 핫이슈 3열,
 * "새로 올라온 이슈" 표, 우측 레일, 푸터.
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
 * 응답이 원문 사진 유무로 갈린 두 목록인데(KAN-480, BE는 KAN-487) 시안은 카드
 * 한 종류의 3열 grid라 사진 있는 기사부터 이어 붙여 한 목록으로 깐다. 사진 없는
 * 카드는 사진 자리에 원문 임베드를 세운다(`HotCard`). 캐러셀(KAN-338)과 텍스트
 * 카드(KAN-480)는 시안에 없어 뺐다.
 *
 * 오늘 경기(LIVE 띠)도 여기서 같이 받는다 — 띠가 스스로 받게 두면 Suspense로
 * 늦게 끼어들며 본문이 밀린다. 세 API는 서로 독립이라 병렬로 받고(`allSettled`
 * — `all`은 하나가 reject되면 멀쩡한 섹션까지 길동무가 된다), 한쪽이 실패해도
 * 페이지 전체를 에러로 떨어뜨리지 않고 그 섹션 자리에만 실패를 보여준다. 띠는
 * 부가 정보라 실패를 빈 배열로 접는다.
 *
 * 레일의 실시간 급상승은 자기 데이터를 스스로 받는다 (KAN-501) — 이 화면이
 * 넘겨줄 게 없어 `Suspense` 경계 안에서 따로 흐른다.
 *
 * 시안의 "HH:MM 갱신"은 서버 렌더 시각이고, 정렬 옵션 "최신순/댓글순"은 정렬
 * API가 없어 최신순 하나만 굳혀 표시한다(API 공백).
 *
 * @param team 서버 렌더할 팀 필터. 홈은 전체(기본값), 팀 허브는 slug의 팀.
 *   초기 HTML에 이 팀의 기사 목록이 들어가야 크롤러가 읽는다.
 */
export async function HomeScreen({ team = "ALL" }: { team?: Filter }) {
  const [hotResult, feedResult, matchResult] = await Promise.allSettled([
    getHotArticles(),
    getArticles({ team }),
    getMatches(todayDateKeyKst()),
  ]);

  const hot = hotResult.status === "fulfilled" ? hotResult.value : null;
  if (hotResult.status === "rejected") {
    console.error("[home] 핫이슈 로드 실패:", hotResult.reason);
  }
  /* 사진 카드는 사진이 주인공이라, 대표 이미지가 빈 카드는 원문 게시물의
     제일 큰 사진으로 메운다 (KAN-484) */
  const heroes = hot ? await withTweetPhotos(hot.withImage) : [];
  // 사진 없는 기사는 세 장까지(HOT_NO_IMAGE_COUNT), 전체는 3열 두 줄까지 깐다
  const cards = [
    ...heroes,
    ...(hot?.withoutImage.slice(0, HOT_NO_IMAGE_COUNT) ?? []),
  ].slice(0, HOT_CARD_COUNT);

  const matches = matchResult.status === "fulfilled" ? matchResult.value : [];
  if (matchResult.status === "rejected") {
    console.error("[home] 오늘 경기 로드 실패:", matchResult.reason);
  }

  let initial: InitialArticleFeed | undefined;
  if (feedResult.status === "fulfilled") {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: feedResult.value, fetchedAt: Date.now() };
  } else {
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러를 보여준다
    console.error("[home] 기사 피드 초기 로드 실패:", feedResult.reason);
  }
  const renderedAt = formatChatTime(new Date().toISOString());

  return (
    <>
      <SiteHeader />
      <LiveStrip matches={matches} />
      <main>
        {/* 좁은 화면에서 맨 위를 당기면 새로고침 (KAN-379). sticky인 SiteHeader는
            transform 껍데기 밖에 둬야 해서 본문만 감싼다 */}
        <FeedPullRefresh surface="news">
          <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_288px]">
            <div className="min-w-0">
              {/* 페이지의 h1 — 화면(UX)은 홈과 같아야 해서 양쪽 다 보이지 않게 둔다.
                  팀 허브는 팀 검색어, 홈은 브랜드·카테고리 검색어를 받는 랜딩이다 (KAN-380) */}
              <h1 className="sr-only">
                {team !== "ALL"
                  ? `${TEAM_FULL_NAMES[team]} 이적 루머`
                  : "해축이모 프리미어리그 이적 루머와 이슈"}
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

              <section>
                <h2 className="text-body-lg text-text-strong pb-2.75 font-black tracking-tight">
                  핫이슈
                </h2>
                {hot === null ? (
                  <p className="text-body text-text-4 py-8 text-center">
                    핫이슈를 불러오지 못했어요
                  </p>
                ) : cards.length === 0 ? (
                  <p className="text-body text-text-4 py-8 text-center">
                    아직 핫이슈가 없어요
                  </p>
                ) : (
                  /* 좁은 화면에서는 한 열로 쌓이고 sm부터 3열이다 */
                  <ul className="grid grid-cols-1 gap-5 pb-7.5 sm:grid-cols-3">
                    {cards.map((article, i) => (
                      <li key={article.id}>
                        <HotCard
                          article={article}
                          rank={i}
                          fetchPriority={i < 3 ? "high" : "low"}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="mt-8.5">
                <div className="flex items-baseline gap-2.5 pb-1.5">
                  <h2 className="text-body-lg text-text-strong font-black tracking-tight">
                    새로 올라온 이슈
                  </h2>
                  <span className="text-caption-lg text-text-3">
                    {renderedAt} 갱신
                  </span>
                  <div aria-hidden className="flex-1" />
                  {/* 정렬 API가 없어 최신순 하나만 굳혀 둔다 */}
                  <span className="text-label-lg text-text-strong font-bold">
                    최신순
                  </span>
                </div>
                <PostFeed initial={initial} initialTeam={team} variant="news" />
              </section>
            </div>

            <SideRail />
          </PageContainer>
        </FeedPullRefresh>

        {/* 푸터 — 당겨서 새로고침 transform 밖에 둬 풀 제스처에 딸려 움직이지
            않는다. 소개문은 팀 탭을 따라가야 해서 클라 조각을 넘긴다 (KAN-384) */}
        <SiteFooter intro={<HomeIntro />} />
      </main>
    </>
  );
}
