import { SubTopBar } from "@/_components/SubTopBar";
import { ArticleShareButton } from "./ArticleShareButton";

/**
 * 기사 세부 상단바. 뒤로 가기 + `{팀명} 이슈` 제목 + 오른쪽 공유 아이콘 (KAN-567).
 * 시안의 세부 화면 공통 한 줄(`SubTopBar`)이다. 팀이 없는 기사는 "이슈"만 남는다.
 *
 * 시안에는 공유 옆에 더보기(⋯)가 하나 더 있는데 프로토타입에도 동작이 없고 기사
 * 신고 API가 없어 뺐다. 눌러서 열 것이 없는 아이콘을 두지 않는다.
 *
 * 뒤로가기는 히스토리 back이다 (KAN-386) — 세부는 홈 리스트와 기사 목록
 * 양쪽에서 들어오므로 목적지를 고정할 수 없다. 딥링크 진입 폴백은 기사 목록.
 *
 * @param teamName - 대표 팀 이름. 없으면 제목이 "이슈"다
 * @param articleId - 공유할 기사 id. 로딩 스켈레톤처럼 아직 모르면 공유 아이콘을 뺀다
 */
export function ArticleTopBar({
  teamName,
  articleId,
}: {
  teamName?: string | null;
  articleId?: string;
}) {
  return (
    <SubTopBar
      title={teamName ? `${teamName} 이슈` : "이슈"}
      backHref="/articles"
      backBehavior="back"
      trailing={
        articleId ? (
          <ArticleShareButton articleId={articleId} variant="bar" />
        ) : undefined
      }
    />
  );
}
