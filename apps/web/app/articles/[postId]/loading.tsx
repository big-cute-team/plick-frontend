import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 기사 세부 로딩 스켈레톤 (KAN-322) — 상세 fetch(`GET /api/v1/articles/{id}`)
 * 동안 실제 본문(ArticleMain)과 같은 구성으로 자리를 잡아둔다: 배지 줄(로고+단계) /
 * 제목 / 기자 라인 / 본문 문단 / 해시태그 / 함께 보면 좋은 기사 / 액션 /
 * 댓글 헤더·입력. GNB는 정적이라 실물을 그대로 그린다.
 *
 * 대표 이미지 자리는 없다 — 발행 기사 사진이 전부 null이라 실제 화면도 텍스트만
 * 흐른다. 사이드바도 준비 중 문구뿐이라 스켈레톤 없이 자리만 비워 둔다.
 */
export default function ArticleDetailLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6 pb-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 animate-pulse">
              {/* 배지 줄 — 구단 로고 + 단계 글자 */}
              <div className="flex items-center gap-2">
                <div className="bg-elevate size-8.5 rounded-full" />
                <div className="bg-elevate rounded-pill h-3.5 w-16" />
              </div>
              {/* 제목 두 줄 */}
              <div className="mt-3 flex flex-col gap-2">
                <div className="bg-elevate rounded-card h-8 w-full" />
                <div className="bg-elevate rounded-card h-8 w-2/3" />
              </div>
              {/* 기자 · 시각 · 조회 라인 */}
              <div className="border-border mt-4 border-b pb-4">
                <div className="bg-elevate rounded-pill h-5 w-1/2" />
              </div>
              {/* 본문 문단 */}
              <div className="mt-5 flex flex-col gap-3">
                <div className="bg-elevate rounded-pill h-5 w-full" />
                <div className="bg-elevate rounded-pill h-5 w-full" />
                <div className="bg-elevate rounded-pill h-5 w-full" />
                <div className="bg-elevate rounded-pill h-5 w-3/4" />
              </div>
              {/* 해시태그 */}
              <div className="mt-5 flex gap-2">
                <div className="bg-elevate rounded-pill h-7 w-20" />
                <div className="bg-elevate rounded-pill h-7 w-24" />
              </div>
              {/* 함께 보면 좋은 기사 — 제목 + 준비 중/카드 자리 */}
              <div className="mt-5 flex flex-col gap-3.5">
                <div className="bg-elevate rounded-pill h-6 w-40" />
                <div className="bg-elevate rounded-pill h-5 w-44 self-center" />
              </div>
              {/* 좋아요·공유 액션 */}
              <div className="border-border mt-4 flex items-center gap-2.5 border-b pb-4">
                <div className="bg-elevate rounded-pill h-9 w-20" />
                <div className="bg-elevate rounded-pill h-9 w-24" />
              </div>
              {/* 댓글 헤더 + 입력창 */}
              <div className="bg-elevate rounded-pill mt-4 h-6 w-20" />
              <div className="mt-3 flex items-center gap-2.5">
                <div className="bg-elevate rounded-pill h-11 flex-1" />
                <div className="bg-elevate size-11 shrink-0 rounded-full" />
              </div>
            </div>
          </div>
        </PageContainer>
      </main>
    </>
  );
}
