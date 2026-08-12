import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { getArticles } from "@plick/core/articles";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { ArticlesFeed } from "./ArticlesFeed";
import { ArticlesScrollArea } from "./ArticlesScrollArea";

/**
 * 기사 목록 화면 본체 — 팀 필터 + 무한스크롤 리스트 (KAN-386).
 *
 * 홈이 첫 페이지 고정 + 더보기 링크로 짧아지면서, 끝까지 내려보는 경험은 이
 * 화면이 맡는다. 웹 기사 페이지(`/articles`)의 모바일 대응이다.
 *
 * 기사 목록(`/articles`)과 팀별 기사(`/articles/teams/[slug]`)가 같은 화면을
 * 그린다 — 팀 탭 선택이 URL로 남아야 새로고침·공유가 그 팀 그대로다(홈 팀
 * 허브 KAN-350과 같은 판단).
 *
 * 해당 탭 첫 페이지는 여기서 미리 받아 씨앗으로 내려준다. 쿼리키가 홈과 같아
 * 홈에서 이미 받은 팀은 캐시를 그대로 이어 쓴다.
 *
 * @param team 서버 렌더할 팀 필터. 기사 목록은 전체(기본값), 팀별 기사는
 *   slug의 팀. 초기 HTML에 이 팀의 기사 목록이 들어가야 크롤러가 읽는다.
 */
export async function ArticlesScreen({ team = "ALL" }: { team?: Filter }) {
  let initial: InitialArticleFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다
    initial = { page: await getArticles({ team }), fetchedAt: Date.now() };
  } catch (error) {
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[articles] 기사 피드 초기 로드 실패:", error);
  }

  return (
    <AppShell>
      <TopBar />
      <ArticlesScrollArea>
        {/* 제목 블록은 ArticlesFeed가 팀 탭과 한 덩어리로 sticky 고정한다 */}
        <ArticlesFeed
          initial={initial}
          initialTeam={team}
          header={
            /* 서버가 prop으로 넘기는 JSX는 직렬화되며 정적 자식 표시를 잃어
               React가 key를 요구한다 — 형제가 생기는 자리라 명시한다 */
            <header key="articles-header" className="px-edge pt-3 pb-2">
              <h1 className="text-section tracking-heading text-text font-extrabold">
                지금 올라온 소식
              </h1>
              <p className="text-caption text-text-4 mt-1 font-semibold">
                팀별 이적 소식을 모아보세요
              </p>
            </header>
          }
        />
      </ArticlesScrollArea>
      <TabBar />
    </AppShell>
  );
}
