import {
  kickoffDateLabel,
  kickoffTimeLabel,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { matchStatusText } from "@/_utils/live";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 경기 상세 스코어 헤더 (시안 KAN-567 → 축소 KAN-709). 한 줄이다. 왼쪽에 홈 팀명과 엠블럼 32,
 * 가운데 104px 칸에 스코어 17/900(예정이면 킥오프 시각)과 그 아래 날짜와 상태 한 줄(11), 오른쪽에
 * 엠블럼과 원정 팀명이다. 진행 중이면 빨간 점과 빨간 "후반 67'", 아니면 회색 "9월 21일 (일) 킥오프
 * 전"이다. 스코어 정본은 `header.score`다(이벤트 요약과 어긋나면 이쪽을 믿는 명세 규약).
 *
 * 전에는 엠블럼 56과 스코어 38을 세 줄로 쌓아 헤더가 130px 가까이 됐다. 예측/프리뷰 탭이 첫 화면에
 * 투표, 팀 비교, 여론 머리글까지 보여야 해서(KAN-709) 팀을 가로로 눕히고 숫자를 줄여 70px 안으로
 * 넣었다. 헤더와 탭 줄은 스크롤 밖에 고정이라(`shrink-0`) 여기서 아낀 높이가 그대로 본문에 간다.
 *
 * 양쪽 팀은 팀 프로필로 가는 링크다 (KAN-484). 빅6 밖 팀은 프로필이 없어 글자로만 남는다.
 *
 * @param header 경기 헤더
 */
export function MatchHeaderBlock({ header }: { header: MatchSummary }) {
  const live = header.status === "LIVE";
  const scheduled =
    header.status === "SCHEDULED" || header.status === "POSTPONED";

  return (
    <div className="px-edge flex shrink-0 items-center gap-2 py-3">
      <TeamSide team={header.home} side="home" />
      <div className="flex w-26 shrink-0 flex-col items-center gap-0.5">
        <span className="text-title text-text-strong tracking-title leading-tight font-black tabular-nums">
          {scheduled
            ? kickoffTimeLabel(header.kickoffAt)
            : `${header.score.home ?? "-"} - ${header.score.away ?? "-"}`}
        </span>
        {live ? (
          <span className="flex items-center gap-1">
            <span aria-hidden className="bg-danger size-1.25 rounded-full" />
            <span className="text-caption text-danger-strong font-bold">
              {matchStatusText(header)}
            </span>
          </span>
        ) : (
          <span className="text-caption text-text-4 font-bold whitespace-nowrap">
            {kickoffDateLabel(header.kickoffAt)} {matchStatusText(header)}
          </span>
        )}
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
    <span className="text-body text-text-strong min-w-0 truncate font-bold">
      {team.name}
    </span>
  );
  return (
    <TeamProfileLink
      team={team}
      className={`flex min-w-0 flex-1 items-center gap-2 active:opacity-70 ${
        side === "home" ? "justify-end" : ""
      }`}
    >
      {side === "home" && name}
      <LiveCrest team={team} size={32} decorative />
      {side === "away" && name}
    </TeamProfileLink>
  );
}
