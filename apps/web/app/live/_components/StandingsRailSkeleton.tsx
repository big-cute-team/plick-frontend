/** 순위표 뼈대의 줄 수. 20팀 전부 대신 첫 화면에 보일 만큼만 깐다. */
const STANDING_ROWS = 10;

/**
 * 우측 순위표의 로딩 자리 (KAN-602). 제목은 실물, 줄은 순위·엠블럼·팀명·수치의
 * 실루엣이다. 라우트 `loading.tsx`와 LIVE 페이지의 Suspense fallback이 같이 쓴다.
 */
export function StandingsRailSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h2 className="text-body-md text-text-strong pb-2.5 font-black">
        순위표
      </h2>
      {Array.from({ length: STANDING_ROWS }, (_, i) => (
        <div
          key={i}
          className="border-border-soft flex h-8.5 items-center gap-2.5 border-b"
        >
          <div className="bg-chip h-3 w-4" />
          <div className="bg-chip size-4.5 rounded-full" />
          <div className="bg-chip h-3 flex-1" />
          <div className="bg-chip h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
