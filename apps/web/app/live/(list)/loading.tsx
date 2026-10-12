import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MatchListSkeleton } from "@/live/_components/MatchListSkeleton";
import { StandingsRailSkeleton } from "@/live/_components/StandingsRailSkeleton";

/** 날짜 줄 뼈대의 칸 수. 실제 줄은 그 달 전체를 가로 스크롤로 깐다. */
const DAY_CELLS = 10;

/**
 * LIVE의 로딩 자리 (KAN-602). 경기 목록과 순위표를 기다리는 동안 상단 바, 제목,
 * 날짜 줄 뼈대, 경기 행 뼈대, 우측 순위표 뼈대를 먼저 그린다.
 *
 * 날짜 줄을 실물로 못 그리는 건 이 파일이 빌드 때 정적으로 굳기 때문이다. 오늘
 * 날짜를 여기서 계산하면 빌드한 날로 박힌다.
 *
 * 라우트 그룹 `(list)` 안에 둬 경기 상세·팀·채팅방까지 이 뼈대로 덮지 않는다.
 * 같은 라우트 안의 날짜 이동(`?date=`)은 트랜지션이라 이 뼈대가 다시 뜨지 않는다.
 */
export default function LiveLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-6.5 pb-12 lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:gap-11">
          <div className="min-w-0">
            <h1 className="text-section text-text-strong tracking-title pb-4.5 font-black">
              LIVE
            </h1>
            <div
              aria-hidden
              className="mb-1.5 flex animate-pulse overflow-hidden shadow-[inset_0_-1px_0_var(--color-border)]"
            >
              {Array.from({ length: DAY_CELLS }, (_, i) => (
                <div
                  key={i}
                  className="flex shrink-0 flex-col items-center gap-1.5 px-3.75 pt-2.25 pb-2.75"
                >
                  <div className="bg-chip h-3 w-4" />
                  <div className="bg-chip h-4.5 w-5" />
                </div>
              ))}
            </div>
            <MatchListSkeleton />
          </div>
          <aside>
            <StandingsRailSkeleton />
          </aside>
        </PageContainer>
      </main>
    </>
  );
}
