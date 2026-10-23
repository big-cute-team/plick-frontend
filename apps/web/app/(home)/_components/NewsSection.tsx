import { unstable_rethrow } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { TEAMS, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { formatChatTime } from "@plick/domain/format";
import { teamCollectionJsonLd } from "@plick/domain/jsonld";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { JsonLd } from "@plick/ui/JsonLd";
import { PostFeed } from "@/_components/PostFeed";
import { SITE_URL } from "@/_constants/site";

/**
 * "새로 올라온 이슈" 섹션. `GET /api/v1/articles`의 해당 탭 첫 페이지를 여기서 미리
 * 받아 씨앗으로 내려준다 (KAN-321). 클라가 같은 데이터를 또 부르는 이중 페치를 막는
 * 씨앗이고, 팀 탭을 바꾸는 순간부터는 클라가 이어받는다.
 *
 * `HomeScreen`이 Suspense로 감싸 스트리밍한다 (KAN-602). 받는 동안은
 * `NewsSectionSkeleton`이 서고, 서버에서 못 받아도 씨앗 없이 내려 클라가 다시 받는다.
 *
 * 시안의 "HH:MM 갱신"은 서버 렌더 시각이고, 정렬 옵션 "최신순/댓글순"은 정렬 API가
 * 없어 최신순 하나만 굳혀 표시한다(API 공백). 팀 허브의 CollectionPage 구조화
 * 데이터(KAN-351)도 서버 렌더된 첫 페이지 기사로 여기서 싣는다.
 *
 * @param team 서버 렌더할 팀 필터. 초기 HTML에 이 팀의 기사 목록이 들어가야 크롤러가 읽는다
 */
export async function NewsSection({ team }: { team: Filter }) {
  let initial: InitialArticleFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다. 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: await getArticles({ team }), fetchedAt: Date.now() };
  } catch (error) {
    /* Next가 제어 흐름으로 쓰는 예외(정적 생성 중단 등)는 되던진다 (KAN-667). 삼키면 빌드
       로그에 "로드 실패"로 찍히고 라우트 판정을 가로챌 수 있다 */
    unstable_rethrow(error);
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러를 보여준다
    console.error("[home] 기사 피드 초기 로드 실패:", error);
  }
  const renderedAt = formatChatTime(new Date().toISOString());

  return (
    <section className="mt-8.5">
      {team !== "ALL" && (
        <JsonLd
          data={teamCollectionJsonLd({
            teamFullName: TEAM_FULL_NAMES[team],
            url: `${SITE_URL}/teams/${TEAMS[team].slug}`,
            siteUrl: SITE_URL,
            articles: initial?.page.items ?? [],
          })}
        />
      )}
      <div className="flex items-baseline gap-2.5 pb-1.5">
        <h2 className="text-body-lg text-text-strong font-black tracking-tight">
          새로 올라온 이슈
        </h2>
        <span className="text-caption-lg text-text-3">{renderedAt} 갱신</span>
        <div aria-hidden className="flex-1" />
        {/* 정렬 API가 없어 최신순 하나만 굳혀 둔다 */}
        <span className="text-label-lg text-text-strong font-bold">최신순</span>
      </div>
      <PostFeed initial={initial} initialTeam={team} />
    </section>
  );
}
