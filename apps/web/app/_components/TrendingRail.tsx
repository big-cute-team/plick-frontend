import { ApiError } from "@plick/core/client";
import { getTrends, TRENDS_COUNT } from "@plick/core/trends";
import { formatChatTime } from "@plick/domain/format";
import type { TrendRanking } from "@plick/domain/types";
import { TrendingEmptyRow } from "@/_components/TrendingEmptyRow";
import { TrendingRow } from "@/_components/TrendingRow";

/**
 * 이슈 랭킹을 받고, BE가 STORY를 몰라 400을 주면 구단 랭킹으로 대신한다.
 *
 * KAN-523 때는 이슈가 3건 미만이어도 구단으로 바꿨다. 이슈 배치가 덜 찬 시간대에
 * 카드가 한두 줄만 있으면 고장 난 것처럼 보인다는 이유였는데, 실제로는 이슈가
 * 있어도 화면에 안 보이고 "구단 순위가 왜 뜨느냐"는 문의만 생겼다(KAN-555). 이제
 * 대체는 400 하나뿐이다 — 운영 BE가 이슈 집계를 릴리스하기 전에 `type=STORY`를
 * 모를 때다. 짧은 이슈 랭킹은 있는 만큼 그리고 남는 순위는 빈 줄로 채운다.
 *
 * 400이 아닌 실패는 구단으로 덮지 않고 null이다. 구단 순위는 이슈 순위의 대용이
 * 아니라서, 이슈 서버가 잠깐 죽었을 때 구단이 뜨면 읽는 사람이 다른 카드로 안다.
 */
async function loadRanking(): Promise<TrendRanking | null> {
  try {
    return await getTrends("STORY");
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 400)) {
      console.error("[trending] 이슈 급상승 로드 실패:", error);
      return null;
    }
  }

  try {
    return await getTrends("TEAM");
  } catch (error) {
    console.error("[trending] 구단 급상승 로드 실패:", error);
    return null;
  }
}

/**
 * 우측 레일의 "실시간 급상승" 상자 (KAN-501, 이슈 전환 KAN-523, 시안 KAN-567
 * "우측 레일"). 전 이름은 `TrendingSection`이었다 — 시안이 레일 조각을 상자 둘
 * (급상승, 채팅방)로 그려 `ChatRail`과 짝이 되게 바꿨다. 홈, 기사 세부, 기사 목록,
 * 이슈, 투표, 프로필이 `SideRail`을 통해 같이 쓴다.
 *
 * 시안: 레일 테두리(`border-strong`) 안에 헤더 "실시간 급상승" 13/900과 집계 시각,
 * 그 밑 줄마다 순위 13/900(1~3위 강조색, 나머지 text-4), 이름 12.5, 변동 11/700이다.
 * 웹 본문에는 테두리를 두르지 않고 레일만 두른다는 시안 규칙의 그 테두리다.
 *
 * 지금 뜨는 이슈를 순위로 세운다. 이슈는 "히샬리송", "포든 퇴장", "맨체스터 더비"
 * 같은 짧은 키워드 단위다(KAN-533). 줄을 누르면 그 이슈의 기사 목록
 * (`/stories/[storyId]`)으로 간다.
 *
 * 상자는 항상 {@link TRENDS_COUNT}줄이다(KAN-555). 이슈가 그보다 적으면 남는
 * 순위를 {@link TrendingEmptyRow}로 채운다 — 레일은 sticky라 줄 수가 회차마다
 * 달라지면 본문 옆에서 상자가 튄다. BE가 STORY를 몰라 400을 줄 때만 구단 랭킹으로
 * 대신하고({@link loadRanking}), 그때는 제목 옆에 "구단 순위"를 달아 무엇의
 * 순위인지 밝힌다. 회차가 아예 없어 빈 배열이면 빈 줄 여섯 개 대신 문구 하나다 —
 * 전부 `-`인 상자는 집계 중인지 고장인지 구분이 안 된다.
 *
 * 상호작용이 없어 전부 서버에서 그린다. 부모가 `Suspense`로 감싼다 — 레일은
 * 본문보다 늦게 와도 되는 자리라, 페이지가 이 요청을 기다리는 대신 껍데기를
 * 먼저 흘려보내고 도착하는 대로 채운다.
 */
export async function TrendingRail() {
  const ranking = await loadRanking();
  const emptyRanks =
    ranking && ranking.items.length > 0
      ? Array.from(
          { length: Math.max(TRENDS_COUNT - ranking.items.length, 0) },
          (_, i) => ranking.items.length + i + 1,
        )
      : [];

  return (
    <section className="border-border-strong border px-3.5 py-3">
      <div className="border-border flex items-baseline justify-between border-b pb-2">
        <h3 className="text-body text-text-strong flex items-baseline gap-2 font-black">
          실시간 급상승
          {ranking?.type === "TEAM" && (
            <span className="text-caption text-text-4 font-semibold">
              구단 순위
            </span>
          )}
        </h3>
        {ranking?.collectedAt && (
          <span className="text-caption text-text-3">
            {formatChatTime(ranking.collectedAt)}
          </span>
        )}
      </div>

      {ranking === null ? (
        <p className="text-body text-text-4 py-4 text-center">
          급상승 랭킹을 불러오지 못했어요
        </p>
      ) : ranking.items.length === 0 ? (
        <p className="text-body text-text-4 py-4 text-center">
          아직 집계된 순위가 없어요
        </p>
      ) : (
        <ol>
          {ranking.items.map((item) => (
            <TrendingRow
              key={item.entityId}
              item={item}
              type={ranking.type === "TEAM" ? "TEAM" : "STORY"}
            />
          ))}
          {emptyRanks.map((rank) => (
            <TrendingEmptyRow key={rank} rank={rank} />
          ))}
        </ol>
      )}
    </section>
  );
}
