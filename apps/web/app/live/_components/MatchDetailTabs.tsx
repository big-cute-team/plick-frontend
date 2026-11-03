import type { MatchDetail, StandingRow } from "@plick/domain/live";
import type { PredictionSummary } from "@plick/domain/prediction";
import { matchEmptyLabel } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";
import { GoalsCard } from "./GoalsCard";
import { LineupCard } from "./LineupCard";
import { MatchNewsCard } from "./MatchNewsCard";
import { PredictionPanel } from "./PredictionPanel";
import { StandingsTable } from "./StandingsTable";
import { StatsCard } from "./StatsCard";
import { TimelineCard } from "./TimelineCard";

/**
 * 경기 상세 좌측 본문 — 지금 탭의 블록들 (KAN-462). 예측/프리뷰는 투표, 팀 비교와 결장자,
 * 접힌 상대 전적과 리그 순위, 여론, 요약은 득점과 타임라인, 라인업은 피치와 벤치, 스탯은
 * 팀 비교, 순위는 리그 표(KAN-567), 뉴스는 양 팀 기사. 각 블록은 서버가 조각 실패 시 null로
 * 내릴 수 있어 블록별 빈 안내가 기본이다. 탭 선택은 `MatchDetailScreen`이 갖고 여기는
 * 받은 탭만 그린다.
 *
 * 빈 자리 문구는 경기 상태를 본다 (KAN-484). 끝난 경기에 라인업이 안 실려 와도
 * 킥오프를 기다리라고 말하지 않게 `matchEmptyLabel`이 갈라 준다.
 *
 * 예측/프리뷰 탭(KAN-696, KAN-699, 통합 KAN-709)은 `PredictionPanel`이 통째로 그린다. 요약이
 * 없는 경기(빅6 밖)는 프리뷰만 든다.
 *
 * @param detail 경기 상세
 * @param tab 지금 탭
 * @param standings 순위 탭의 표. 서버가 못 받았으면 null
 * @param prediction 예측 요약. 예측 없는 경기는 null
 */
export function MatchDetailTabs({
  detail,
  tab,
  standings,
  prediction,
}: {
  detail: MatchDetail;
  tab: MatchTabKey;
  standings: StandingRow[] | null;
  prediction: PredictionSummary | null;
}) {
  const { header } = detail;

  if (tab === "prediction") {
    return <PredictionPanel detail={detail} summary={prediction} />;
  }
  if (tab === "news") {
    return <MatchNewsCard header={header} />;
  }
  if (tab === "table") {
    return standings ? (
      <StandingsTable rows={standings} header={header} />
    ) : (
      <EmptyBlock label="순위표를 불러오지 못했어요" />
    );
  }
  if (tab === "summary") {
    return detail.events ? (
      <>
        <GoalsCard goals={detail.goals} />
        <TimelineCard header={header} events={detail.events} />
      </>
    ) : (
      <EmptyBlock label={matchEmptyLabel("summary", header.status)} />
    );
  }
  if (tab === "lineups") {
    return detail.lineups ? (
      <LineupCard home={detail.lineups.home} away={detail.lineups.away} />
    ) : (
      <EmptyBlock label={matchEmptyLabel("lineups", header.status)} />
    );
  }
  return detail.stats ? (
    <StatsCard stats={detail.stats} />
  ) : (
    <EmptyBlock label={matchEmptyLabel("stats", header.status)} />
  );
}

function EmptyBlock({ label }: { label: string }) {
  return <p className="text-body-md text-text-4 py-10">{label}</p>;
}
