import { getArticles } from "@plick/core/articles";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { PostFeed } from "@/_components/PostFeed";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 데스크톱 기사 화면 본체 (KAN-207) — GNB + 중앙 정렬 단일 컬럼(max-w-read)에
 * 제목·부제 + 팀 필터 탭 + 팀별 이적 기사 리스트. 피그마 W10(node 222-2).
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

  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-read px-gutter mx-auto w-full pt-7 pb-22">
          <header>
            <h1 className="text-hero text-text tracking-heading font-extrabold">
              기사
            </h1>
            <p className="text-body text-text-3 mt-1.5 font-semibold">
              팀별 이적 소식을 모아보세요
            </p>
          </header>
          <div className="pt-4.5">
            <PostFeed initial={initial} initialTeam={team} variant="article" />
          </div>
        </div>
      </main>
    </>
  );
}
