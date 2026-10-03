import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { ArticleTopBar } from "./_components/ArticleTopBar";

/**
 * 기사 세부 로딩 스켈레톤 — 상세 fetch(`GET /api/v1/articles/{id}`) 동안
 * 실제 본문(ArticleBody)과 같은 구성으로 자리를 잡아둔다(KAN-567 시안 순서):
 * 팀 줄 / 제목 / 기자와 시각 / 본문 문단 / 태그 칩 / 액션 / 관련 기사 제목과 행 /
 * 댓글 헤더와 입력. 상단바는 팀 이름을 아직 몰라 "이슈"만 선다.
 *
 * 대표 이미지 자리는 없다 — 발행 기사 사진이 전부 null이라 실제 화면도 텍스트만
 * 흐른다(KAN-301).
 */
export default function ArticleDetailLoading() {
  return (
    <AppShell>
      <ArticleTopBar />
      <ScrollArea>
        <div className="px-edge flex animate-pulse flex-col gap-3.5 pt-4.5">
          {/* 팀 줄 — 엠블럼 + 팀명 */}
          <div className="flex items-center gap-1.75">
            <div className="bg-elevate size-4.5 rounded-full" />
            <div className="bg-elevate rounded-pill h-3 w-14" />
          </div>
          {/* 제목 (2줄) */}
          <div className="flex flex-col gap-2">
            <div className="bg-elevate rounded-tile h-7 w-full" />
            <div className="bg-elevate rounded-tile h-7 w-3/4" />
          </div>
          {/* 기자와 시각, 조회 */}
          <div className="bg-elevate rounded-pill h-3.5 w-1/2" />
          {/* 본문 문단 */}
          <div className="flex flex-col gap-2.5">
            <div className="bg-elevate rounded-pill h-4 w-full" />
            <div className="bg-elevate rounded-pill h-4 w-full" />
            <div className="bg-elevate rounded-pill h-4 w-2/3" />
          </div>
          {/* 태그 칩 */}
          <div className="flex gap-1.5">
            <div className="bg-elevate rounded-pill h-7 w-16" />
            <div className="bg-elevate rounded-pill h-7 w-20" />
          </div>
          {/* 좋아요와 공유 */}
          <div className="flex items-center gap-5">
            <div className="bg-elevate rounded-pill h-4.5 w-12" />
            <div className="bg-elevate rounded-pill h-4.5 w-12" />
          </div>
          {/* 관련 기사 — 제목 + 행 */}
          <div className="flex flex-col gap-3 pt-3">
            <div className="bg-elevate rounded-pill h-4.5 w-32" />
            <div className="flex items-center gap-2.25">
              <div className="bg-elevate size-6.5 rounded-full" />
              <div className="bg-elevate rounded-pill h-3.5 flex-1" />
            </div>
            <div className="flex items-center gap-2.25">
              <div className="bg-elevate size-6.5 rounded-full" />
              <div className="bg-elevate rounded-pill h-3.5 flex-1" />
            </div>
          </div>
          {/* 댓글 헤더 + 입력줄 */}
          <div className="bg-elevate rounded-pill mt-3 h-4.5 w-16" />
          <div className="flex items-center gap-2">
            <div className="bg-elevate rounded-control h-10.5 flex-1" />
            <div className="bg-elevate rounded-control h-10.5 w-16" />
          </div>
        </div>
      </ScrollArea>
      {/* 실제 화면(page.tsx)에도 하단바가 있다 — 여기 없으면 로딩이 끝나는 순간
          본문이 탭바 높이만큼 밀린다 (KAN-314) */}
      <TabBar />
    </AppShell>
  );
}
