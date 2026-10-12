import { getStandings } from "@plick/core/live";
import { LiveLoadError } from "./LiveLoadError";
import { StandingsRail } from "./StandingsRail";

/**
 * 우측 순위표. 서버 컴포넌트 fetch(단발 읽기)이고, 실패하면 표 자리에 에러 지면을 둔다.
 * LIVE 페이지가 Suspense로 감싸 경기 목록과 따로 스트리밍한다 (KAN-602).
 */
export async function StandingsSection() {
  let rows;
  try {
    rows = await getStandings();
  } catch (error) {
    console.error("[live] 순위표 로드 실패:", error);
  }

  if (rows) return <StandingsRail rows={rows} />;
  return (
    <>
      <div className="flex items-baseline justify-between pb-2.5">
        <h2 className="text-body-md text-text-strong font-black">순위표</h2>
      </div>
      <LiveLoadError compact />
    </>
  );
}
