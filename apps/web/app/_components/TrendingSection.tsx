import { ApiError } from "@plick/core/client";
import { getTrends } from "@plick/core/trends";
import { formatRelativeTime } from "@plick/domain/format";
import type { TrendRanking } from "@plick/domain/types";
import { TrendingRow } from "@/_components/TrendingRow";
import { STORY_TREND_MIN } from "@/_constants/trends";

/**
 * 이슈 랭킹을 받고, 실패했거나 너무 짧으면 구단 랭킹으로 대신한다 (KAN-523).
 *
 * 운영 BE가 이슈 집계를 릴리스하기 전에는 `type=STORY`에 400이 온다. 그때도
 * 카드가 비지 않게 하려는 대체다. 구단 랭킹까지 실패하면 null이다.
 */
async function loadRanking(): Promise<TrendRanking | null> {
  try {
    const story = await getTrends("STORY");
    if (story.items.length >= STORY_TREND_MIN) return story;
  } catch (error) {
    // 400은 STORY를 모르는 옛 BE의 정상 경로라 로그를 남기지 않는다
    if (!(error instanceof ApiError && error.status === 400)) {
      console.error("[trending] 이슈 급상승 로드 실패:", error);
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
 * "실시간 급상승" 랭킹 섹션 — 사이드바 카드 한 장 (KAN-501, 이슈 전환 KAN-523).
 *
 * 지금 뜨는 이슈를 순위로 세운다. 홈과 기사 세부 사이드바가 공용한다.
 *
 * KAN-501 때는 구단·선수 두 탭이었다. "토트넘 1위"는 왜 뜨는지가 안 보여서,
 * 기사 묶음(이슈) 단위 랭킹이 생기면서 이슈 한 목록으로 바꿨다. 이슈는
 * "히샬리송", "포든 퇴장", "맨체스터 더비" 같은 짧은 키워드 단위다(KAN-533). 줄을 누르면 그 이슈의 기사 목록(`/stories/[storyId]`)으로
 * 간다. 이슈 랭킹이 없거나 짧으면 구단 랭킹을 대신 깔고({@link loadRanking}),
 * 그때는 제목 옆에 "구단 순위"를 달아 무엇의 순위인지 밝힌다.
 *
 * 상호작용이 없어 전부 서버에서 그린다. 탭이 있던 때는 클라 컴포넌트가
 * 필요했지만 이제 고를 것이 없다.
 *
 * 부모가 이 컴포넌트를 `Suspense`로 감싼다. 사이드바는 본문보다 늦게 와도 되는
 * 자리라, 페이지가 이 요청을 기다리는 대신 껍데기를 먼저 흘려보내고 도착하는
 * 대로 채운다.
 */
export async function TrendingSection() {
  const ranking = await loadRanking();

  return (
    <section className="bg-elevate-2 border-border rounded-card p-edge flex flex-col gap-2.5 border">
      <h3 className="text-gnb text-text flex items-baseline gap-2 font-extrabold">
        실시간 급상승
        {ranking?.type === "TEAM" && (
          <span className="text-caption text-text-4 font-semibold">
            구단 순위
          </span>
        )}
      </h3>

      {ranking === null ? (
        <p className="text-body text-text-4 py-4 text-center">
          급상승 랭킹을 불러오지 못했어요.
        </p>
      ) : ranking.items.length === 0 ? (
        <p className="text-body text-text-4 py-4 text-center">
          아직 집계된 순위가 없어요.
        </p>
      ) : (
        <>
          <ol>
            {ranking.items.map((item) => (
              <TrendingRow
                key={item.entityId}
                item={item}
                type={ranking.type === "TEAM" ? "TEAM" : "STORY"}
              />
            ))}
          </ol>
          {ranking.collectedAt && (
            <p className="text-caption text-text-4 text-right">
              {formatRelativeTime(ranking.collectedAt)} 집계
            </p>
          )}
        </>
      )}
    </section>
  );
}
