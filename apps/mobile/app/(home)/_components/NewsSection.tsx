import { getArticles } from "@plick/core/articles";
import { TEAMS, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { teamCollectionJsonLd } from "@plick/domain/jsonld";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { JsonLd } from "@plick/ui/JsonLd";
import { WEB_SITE_URL } from "@/_constants/site";
import { NewsFeed } from "./NewsFeed";

/**
 * "지금 올라온 소식" 섹션. `GET /api/v1/articles`의 해당 탭 첫 페이지를 여기서 미리
 * 받아 씨앗으로 내려준다. 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고,
 * 팀 탭을 바꾸는 순간부터는 클라가 이어받는다 (KAN-271).
 *
 * `HomeScreen`이 Suspense로 감싸 스트리밍한다 (KAN-602). 받는 동안은
 * `NewsSectionSkeleton`이 서고, 서버에서 못 받아도 씨앗 없이 내려 클라가 다시 받는다.
 *
 * 팀 허브의 CollectionPage 구조화 데이터(KAN-351)도 여기서 싣는다. 서버 렌더된 첫
 * 페이지 기사로 ItemList를 채우기 때문이다.
 *
 * @param team 서버 렌더할 팀 필터. 홈은 전체, 팀 허브는 slug의 팀
 */
export async function NewsSection({ team }: { team: Filter }) {
  let initial: InitialArticleFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다. 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: await getArticles({ team }), fetchedAt: Date.now() };
  } catch (error) {
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[home] 기사 피드 초기 로드 실패:", error);
  }

  return (
    <section className="pt-5">
      {team !== "ALL" && (
        <JsonLd
          data={teamCollectionJsonLd({
            teamFullName: TEAM_FULL_NAMES[team],
            url: `${WEB_SITE_URL}/teams/${TEAMS[team].slug}`,
            siteUrl: WEB_SITE_URL,
            articles: initial?.page.items ?? [],
          })}
        />
      )}
      <h2 className="text-body-lg text-text-strong tracking-section px-edge pb-2 font-black">
        지금 올라온 소식
      </h2>
      <NewsFeed initial={initial} initialTeam={team} />
    </section>
  );
}
