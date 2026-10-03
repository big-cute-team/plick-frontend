import { kickoffTimeLabel, type MatchSummary } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { kickoffFullLabel, matchStatusText } from "@/_utils/live";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 경기 상세 스코어 헤더 (시안 KAN-567). 양쪽에 엠블럼 56과 팀명 13.5/700, 가운데
 * 132px 칸에 킥오프 한 줄(11 보조색), 스코어 38/900(예정이면 킥오프 시각), 그 아래
 * 상태 한 줄이다. 진행 중이면 빨간 점 5px과 빨간 "후반 67'", 아니면 회색 "경기
 * 종료" 같은 문구다. 스코어 정본은 `header.score`다(이벤트 요약과 어긋나면 이쪽을
 * 믿는 명세 규약). 전의 상태 칩(알약)은 시안이 글자만이라 뺐다.
 *
 * 양쪽 팀은 팀 프로필로 가는 링크다 (KAN-484). 빅6 밖 팀은 프로필이 없어 글자로만
 * 남는다. 상세 화면은 이 블록을 탭 줄과 함께 스크롤 밖에 고정한다(`shrink-0`).
 *
 * @param header 경기 헤더
 */
export function MatchHeaderBlock({ header }: { header: MatchSummary }) {
  const live = header.status === "LIVE";
  const scheduled =
    header.status === "SCHEDULED" || header.status === "POSTPONED";

  return (
    <div className="px-edge flex shrink-0 items-center gap-2 pt-5.5 pb-4.5">
      <TeamSide team={header.home} />
      <div className="flex w-33 shrink-0 flex-col items-center gap-1.75">
        <span className="text-caption text-text-3">
          {kickoffFullLabel(header.kickoffAt)}
        </span>
        <span className="text-score text-text-strong tracking-title font-black">
          {scheduled
            ? kickoffTimeLabel(header.kickoffAt)
            : `${header.score.home ?? "-"} - ${header.score.away ?? "-"}`}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="bg-danger size-1.25 rounded-full" />
            <span className="text-label text-danger font-bold">
              {matchStatusText(header)}
            </span>
          </span>
        ) : (
          <span className="text-label text-text-4 font-bold">
            {matchStatusText(header)}
          </span>
        )}
      </div>
      <TeamSide team={header.away} />
    </div>
  );
}

function TeamSide({ team }: { team: MatchSummary["home"] }) {
  return (
    <TeamProfileLink
      team={team}
      className="flex min-w-0 flex-1 flex-col items-center gap-2.25 active:opacity-70"
    >
      <LiveCrest team={team} size={56} />
      <span className="text-body text-text-strong max-w-full truncate text-center font-bold">
        {team.name}
      </span>
    </TeamProfileLink>
  );
}
