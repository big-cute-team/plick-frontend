import {
  kickoffDateLabel,
  kickoffTimeLabel,
  matchStatusLabel,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 경기 상세 스코어 헤더 (KAN-462 → KAN-567 시안 경기 상세 828-852행 → 축소 KAN-709). 한 줄이다.
 * 왼쪽에 홈 팀명 15/700과 엠블럼 44, 가운데 최소 160px 칸에 스코어 22/900(예정이면 킥오프 시각)과
 * 그 아래 날짜와 상태 한 줄(11.5), 오른쪽에 엠블럼과 원정 팀명. 진행 중이면 빨간 점과 분, 아니면
 * 회색 "9월 21일 (일) 킥오프 전"이다. 아래 섹션 구분선으로 끊는다. 스코어 정본은 `header.score`다
 * (명세 규약).
 *
 * 시안은 엠블럼 72와 스코어 46을 세 줄로 쌓았다. 예측/프리뷰 탭이 1280×800 첫 화면에 투표, 팀 비교
 * 2단, 여론 머리글까지 걸쳐 보여야 해서(KAN-709) 팀을 가로로 눕히고 숫자를 줄였다.
 *
 * 양쪽 팀은 팀 프로필로 가는 링크다 (KAN-484). 빅6 밖 팀은 프로필이 없어 글자로만 남는다.
 */
export function MatchHeaderCard({ header }: { header: MatchSummary }) {
  const scheduled =
    header.status === "SCHEDULED" || header.status === "POSTPONED";
  return (
    <div className="border-border flex items-center gap-4 border-b pb-4 lg:gap-6.5">
      <TeamSide team={header.home} side="home" />
      <div className="flex shrink-0 flex-col items-center gap-1 lg:min-w-40">
        <span className="text-section text-text-strong tracking-title leading-tight font-black tabular-nums">
          {scheduled
            ? header.status === "POSTPONED"
              ? "연기"
              : kickoffTimeLabel(header.kickoffAt)
            : `${header.score.home ?? "-"} : ${header.score.away ?? "-"}`}
        </span>
        <StatusLine header={header} />
      </div>
      <TeamSide team={header.away} side="away" />
    </div>
  );
}

/** 팀 한쪽. 홈은 팀명 다음 엠블럼이 스코어 쪽에 붙고, 원정은 엠블럼 다음 팀명이다. */
function TeamSide({
  team,
  side,
}: {
  team: MatchSummary["home"];
  side: "home" | "away";
}) {
  const name = (
    <span
      className={`text-body-lg group-hover:text-accent min-w-0 truncate font-bold transition-colors ${team.code ? "text-text-strong" : "text-text-3"}`}
    >
      {team.name}
    </span>
  );
  return (
    <TeamProfileLink
      team={team}
      className={`group focus-visible:outline-accent flex min-w-0 flex-1 items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 ${
        side === "home" ? "justify-end" : ""
      }`}
    >
      {side === "home" && name}
      <LiveCrest team={team} size={44} decorative />
      {side === "away" && name}
    </TeamProfileLink>
  );
}

/** 스코어 아래 한 줄. 라이브는 빨간 점과 구간·분, 그 밖은 날짜와 상태 문구다. */
function StatusLine({ header }: { header: MatchSummary }) {
  if (header.status === "LIVE") {
    const { primary, secondary } = matchStatusLabel(header);
    return (
      <span className="text-caption-lg text-danger-strong flex items-center gap-1.5 font-bold">
        <span aria-hidden className="bg-danger size-1.25 rounded-full" />
        {secondary} {primary}
      </span>
    );
  }
  const label =
    header.status === "SCHEDULED"
      ? "킥오프 전"
      : header.status === "FINISHED"
        ? `경기 종료 ${header.statusDetail ?? "FT"}`
        : "추후 일정 공지";
  return (
    <span className="text-caption-lg text-text-4 font-bold whitespace-nowrap">
      {kickoffDateLabel(header.kickoffAt)} {label}
    </span>
  );
}
