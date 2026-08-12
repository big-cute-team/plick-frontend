import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 기사 세부 상단바 — 뒤로가기만 있는 얇은 크롬.
 *
 * 퍼블리싱 때 있던 우측 저장·공유 아이콘은 KAN-283에서 뺐다 — 저장은 BE
 * 계약에 없고, 공유는 본문 하단 액션으로 충분해서다.
 *
 * 뒤로가기는 히스토리 back이다 (KAN-386) — 세부는 홈 리스트와 기사 목록
 * 양쪽에서 들어오므로 목적지를 고정할 수 없다. 딥링크 진입 폴백은 기사 목록.
 */
export function ArticleTopBar() {
  return (
    <TopBarShell>
      <BackButton href="/articles" behavior="back" />
    </TopBarShell>
  );
}
