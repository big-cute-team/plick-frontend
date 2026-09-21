import type { MatchDetail } from "@plick/domain/live";
import { matchEmptyLabel } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";
import { GoalsCard } from "./GoalsCard";
import { LineupCard } from "./LineupCard";
import { MatchNewsCard } from "./MatchNewsCard";
import { PreviewGrid } from "./PreviewGrid";
import { StatsCard } from "./StatsCard";
import { TimelineCard } from "./TimelineCard";

/**
 * 경기 상세 좌측 본문 — 지금 탭의 카드들 (KAN-462). 모바일 `MatchDetailTabs`와
 * 같은 구성이다: 프리뷰는 결장자·상대전적·순위·직전 선발, 요약은 득점·타임라인,
 * 라인업은 피치와 벤치, 스탯은 팀 비교, 뉴스는 양 팀 기사. 각 블록은 서버가
 * 조각 실패 시 null로 내릴 수 있어 블록별 빈 안내가 기본이다. 탭 선택은
 * `MatchDetailScreen`이 갖고 여기는 받은 탭만 그린다.
 *
 * 빈 자리 문구는 경기 상태를 본다 (KAN-484) — 끝난 경기에 라인업이 안 실려 와도
 * 킥오프를 기다리라고 말하지 않게 `matchEmptyLabel`이 갈라 준다.
 *
 * @param detail 경기 상세
 * @param tab 지금 탭
 */
export function MatchDetailTabs({
  detail,
  tab,
}: {
  detail: MatchDetail;
  tab: MatchTabKey;
}) {
  const { header } = detail;

  if (tab === "preview") {
    return detail.preview ? (
      <PreviewGrid preview={detail.preview} />
    ) : (
      <EmptyBlock label="프리뷰 정보가 아직 없어요" />
    );
  }
  if (tab === "news") {
    return <MatchNewsCard header={header} />;
  }
  if (tab === "summary") {
    return detail.events ? (
      <div className="flex flex-col gap-3">
        <GoalsCard goals={detail.goals} />
        <TimelineCard header={header} events={detail.events} />
        <Caption status={header.status} />
      </div>
    ) : (
      <EmptyBlock label={matchEmptyLabel("summary", header.status)} />
    );
  }
  if (tab === "lineups") {
    return detail.lineups ? (
      <LineupCard
        matchId={header.id}
        live={header.status === "LIVE"}
        home={detail.lineups.home}
        away={detail.lineups.away}
      />
    ) : (
      <EmptyBlock label={matchEmptyLabel("lineups", header.status)} />
    );
  }
  return detail.stats ? (
    <StatsCard stats={detail.stats} status={header.status} />
  ) : (
    <EmptyBlock label={matchEmptyLabel("stats", header.status)} />
  );
}

/** 라이브 중에만 폴링 안내를, 종료 후엔 확정 안내를 단다. */
function Caption({ status }: { status: MatchDetail["header"]["status"] }) {
  return (
    <p className="text-body text-text-4 text-center">
      {status === "LIVE"
        ? "라이브 중에는 20초마다 자동 갱신돼요"
        : "경기가 끝났어요 · 선수 평점은 확정 값이에요"}
    </p>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <p className="bg-elevate rounded-card text-body-lg text-text-4 py-20 text-center">
      {label}
    </p>
  );
}
