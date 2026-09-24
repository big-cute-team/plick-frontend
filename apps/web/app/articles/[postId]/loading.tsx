import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { TrendingRailSkeleton } from "@/_components/TrendingRailSkeleton";

/**
 * 기사 세부 로딩 스켈레톤 (KAN-322, 시안 KAN-567) — 상세 fetch
 * (`GET /api/v1/articles/{id}`) 동안 실제 본문(ArticleMain)과 같은 구성으로 자리를
 * 잡아둔다: 빵부스러기 / 제목 / 기자 줄 / 본문 문단 / 태그 / 액션 / 관련 기사 /
 * 댓글 헤더·입력. 상단 바는 정적이라 실물을 그대로 그리고, 우측 레일 자리에는
 * 급상승 스켈레톤을 세운다. LIVE 띠는 경기 유무를 모르니 비워 둔다.
 *
 * 대표 이미지 자리는 없다 — 발행 기사 사진이 전부 null이라 실제 화면도 텍스트만
 * 흐른다.
 */
export default function ArticleDetailLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_288px]">
          <div className="min-w-0 animate-pulse">
            {/* 빵부스러기 */}
            <div className="flex items-center gap-1.75 pb-4.5">
              <div className="bg-elevate h-3 w-7" />
              <div className="bg-elevate h-3 w-16" />
            </div>
            <div className="max-w-read">
              {/* 제목 두 줄 */}
              <div className="flex flex-col gap-2.5">
                <div className="bg-elevate h-8 w-full" />
                <div className="bg-elevate h-8 w-2/3" />
              </div>
              {/* 기자 · 시각 · 조회 라인 */}
              <div className="border-border mt-3.5 border-b pb-4">
                <div className="bg-elevate h-4 w-1/2" />
              </div>
              {/* 본문 문단 */}
              <div className="mt-5 flex flex-col gap-3.75">
                <div className="bg-elevate h-5 w-full" />
                <div className="bg-elevate h-5 w-full" />
                <div className="bg-elevate h-5 w-full" />
                <div className="bg-elevate h-5 w-3/4" />
              </div>
              {/* 태그 */}
              <div className="flex gap-2 pt-5">
                <div className="bg-elevate h-4 w-14" />
                <div className="bg-elevate h-4 w-20" />
              </div>
              {/* 좋아요·공유 액션 */}
              <div className="border-border mt-5.5 flex items-center gap-5.5 border-t pt-5">
                <div className="bg-elevate h-4 w-12" />
                <div className="bg-elevate h-4 w-8" />
              </div>
            </div>
            {/* 관련 기사 */}
            <div className="bg-elevate mt-8.5 h-4 w-16" />
            <div className="mt-2.5 grid grid-cols-1 gap-x-8.5 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="border-border-soft flex h-8.5 items-center border-b"
                >
                  <div className="bg-elevate h-3.5 w-4/5" />
                </div>
              ))}
            </div>
            {/* 댓글 헤더 + 입력창 */}
            <div className="bg-elevate mt-8.5 h-4 w-14" />
            <div className="mt-3 flex gap-2">
              <div className="bg-elevate h-9.5 flex-1" />
              <div className="bg-elevate h-9.5 w-16 shrink-0" />
            </div>
          </div>
          <aside className="hidden lg:block">
            <TrendingRailSkeleton />
          </aside>
        </PageContainer>
      </main>
    </>
  );
}
