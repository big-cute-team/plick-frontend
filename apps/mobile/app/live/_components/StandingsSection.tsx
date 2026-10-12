import { getStandings } from "@plick/core/live";
import { StandingsTable } from "./StandingsTable";

/**
 * LIVE 목록 맨 아래 순위표. 폴링 없는 단발 읽기라 서버에서 받고, 실패하면 표 자리에
 * 문구만 둔다. LIVE 페이지가 Suspense로 감싸 경기 목록과 따로 스트리밍한다 (KAN-602).
 */
export async function StandingsSection() {
  let rows;
  try {
    rows = await getStandings();
  } catch (error) {
    console.error("[live] 순위표 로드 실패:", error);
  }

  return (
    <section className="px-edge pt-7">
      {rows ? (
        <StandingsTable rows={rows} title="순위표" legend />
      ) : (
        <p className="text-body text-text-4 py-10 text-center">
          순위표를 불러오지 못했어요
        </p>
      )}
    </section>
  );
}
