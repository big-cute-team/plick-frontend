import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { ArticleTopBar } from "./_components/ArticleTopBar";

/**
 * 기사 세부 로딩 스켈레톤 — 상세 fetch(`GET /api/v1/articles/{id}`) 동안
 * 실제 본문(ArticleBody)과 같은 구성으로 끝까지 자리를 잡아둔다: 배지 줄
 * (로고+단계) / 제목 / 기자 라인 / 본문 문단 / 해시태그 / 함께 보면 좋은
 * 기사 / 액션 / 댓글 헤더·입력. 상단바는 정적이라 실물을 그대로 그린다.
 *
 * 트윗 임베드·대표 이미지 자리는 없다 — 발행 기사 사진이 전부 null이라 실제
 * 화면도 텍스트만 흐른다(KAN-301). 바 높이는 실측 기준: 배지 30 / 헤드라인
 * 한 줄 32 / 기자 라인 20 / 본문 한 줄 26 / 해시태그 26 / 액션 36 / 입력 44.
 */
export default function ArticleDetailLoading() {
  return (
    <AppShell>
      <ArticleTopBar />
      <ScrollArea>
        <div className="px-edge flex animate-pulse flex-col gap-3.5 pt-1">
          {/* 배지 줄 — 구단 로고 + 단계 글자 */}
          <div className="flex items-center gap-2">
            <div className="bg-elevate size-7.5 rounded-full" />
            <div className="bg-elevate rounded-pill h-3 w-14" />
          </div>
          {/* 제목 (헤드라인 1~2줄) */}
          <div className="bg-elevate rounded-card h-8 w-full" />
          {/* 기자 · 시각 · 조회 라인 */}
          <div className="bg-elevate rounded-pill h-4 w-1/2" />
          {/* 본문 문단 */}
          <div className="flex flex-col gap-2.5">
            <div className="bg-elevate rounded-pill h-4 w-full" />
            <div className="bg-elevate rounded-pill h-4 w-full" />
            <div className="bg-elevate rounded-pill h-4 w-2/3" />
          </div>
          {/* 해시태그 */}
          <div className="bg-elevate rounded-pill h-6.5 w-20" />
          {/* 함께 보면 좋은 기사 — 제목 + 준비 중/카드 자리 */}
          <div className="flex flex-col gap-2.5">
            <div className="bg-elevate rounded-pill h-5 w-36" />
            <div className="bg-elevate rounded-pill h-4 w-40 self-center" />
          </div>
          {/* 좋아요·공유 액션 */}
          <div className="border-border flex items-center gap-1.5 border-b pb-4">
            <div className="bg-elevate rounded-pill h-9 w-18" />
            <div className="bg-elevate rounded-pill h-9 w-22" />
          </div>
          {/* 댓글 헤더 + 입력창 */}
          <div className="bg-elevate rounded-pill h-5 w-16" />
          <div className="flex items-center gap-2.5">
            <div className="bg-elevate rounded-pill h-11 flex-1" />
            <div className="bg-elevate size-11 shrink-0 rounded-full" />
          </div>
        </div>
      </ScrollArea>
      {/* 실제 화면(page.tsx)에도 하단바가 있다 — 여기 없으면 로딩이 끝나는 순간
          본문이 탭바 높이만큼 밀린다 (KAN-314) */}
      <TabBar />
    </AppShell>
  );
}
