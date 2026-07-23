import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { ArticleTopBar } from "./_components/ArticleTopBar";

/**
 * 기사 세부 로딩 스켈레톤 — 상세 fetch(`GET /api/v1/articles/{id}`) 동안
 * 칩·제목·기자 라인·대표 이미지·문단 자리를 잡아둔다. 상단바는 정적이라
 * 실물을 그대로 그린다.
 */
export default function ArticleDetailLoading() {
  return (
    <AppShell>
      <ArticleTopBar />
      <ScrollArea>
        <div className="px-edge flex animate-pulse flex-col gap-3.5 pt-1">
          <div className="bg-elevate rounded-pill h-7 w-24" />
          <div className="bg-elevate rounded-card h-14" />
          <div className="bg-elevate rounded-card h-6 w-2/3" />
          <div className="bg-elevate rounded-card h-48 w-full" />
          <div className="bg-elevate rounded-card h-24" />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
