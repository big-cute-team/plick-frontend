import { groupAbsenteesByTeam } from "@plick/domain/live";
import type { MatchPreview } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 킥오프 전 프리뷰 (KAN-462 → KAN-567 톤 정리). 왼쪽에 결장자, 상대전적, 오른쪽에
 * 리그 순위, 직전 선발을 둔다. 시안 웹 규칙대로 본문 카드에 면과 테두리를 두르지
 * 않고 섹션 제목 14/900과 여백으로 끊는다. 각 블록은 비어 있으면 그리지 않는다
 * (서버가 조각 실패 시 그 조각만 빼고 내리는 구조).
 */
export function PreviewGrid({ preview }: { preview: MatchPreview }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
      <div>
        {preview.absentees.length > 0 && <Absentees preview={preview} />}
        {preview.headToHead.length > 0 && <HeadToHead preview={preview} />}
      </div>
      <div>
        {preview.leaguePositions.length > 0 && (
          <LeaguePositions preview={preview} />
        )}
        {preview.lastLineups.length > 0 && <LastLineups preview={preview} />}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-body-md text-text-strong pt-4.5 pb-2 font-black">
      {children}
    </p>
  );
}

/** 결장자는 팀별로 묶어 홈 그룹부터 보여준다 (KAN-459). 팀 줄 아래에 선수 줄이 붙는다. */
function Absentees({ preview }: { preview: MatchPreview }) {
  return (
    <section>
      <SectionTitle>결장자</SectionTitle>
      {groupAbsenteesByTeam(preview.absentees).map((group) => (
        <div key={group.team.shortName} className="pb-3">
          <p className="flex items-center gap-2 pb-1">
            <TeamProfileLink
              team={group.team}
              className="hover:text-accent flex items-center gap-1.75 transition-colors"
            >
              <LiveCrest team={group.team} size={18} />
              <span className="text-body text-text-strong font-bold">
                {group.team.name}
              </span>
            </TeamProfileLink>
            <span className="text-caption-lg text-text-4">
              {group.players.length}명
            </span>
          </p>
          {group.players.map((absentee) => (
            <div
              key={absentee.playerName}
              className="border-border-soft flex items-center gap-3 border-b py-2"
            >
              <span className="text-body text-text-strong min-w-0 flex-1 truncate font-medium">
                {absentee.playerName}
              </span>
              <span
                className={`text-caption-lg font-bold ${
                  absentee.kind === "SUSPENSION" ? "text-danger" : "text-warn"
                }`}
              >
                {absentee.reason}
              </span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function HeadToHead({ preview }: { preview: MatchPreview }) {
  return (
    <section>
      <SectionTitle>상대 전적, 최근 5경기</SectionTitle>
      {preview.headToHead.map((game) => (
        <div
          key={`${game.date}-${game.line}`}
          className="border-border-soft flex items-center gap-2 border-b py-2"
        >
          <span className="text-label text-text-3 w-20 shrink-0">
            {game.date}
          </span>
          <span className="text-body text-text-strong flex-1 text-center font-medium">
            {game.line}
          </span>
          <span
            className={`text-label-lg w-7 shrink-0 text-center font-black ${
              game.result === "W"
                ? "text-accent"
                : game.result === "L"
                  ? "text-text-4"
                  : "text-text-3"
            }`}
          >
            {game.result}
          </span>
        </div>
      ))}
    </section>
  );
}

function LeaguePositions({ preview }: { preview: MatchPreview }) {
  return (
    <section>
      <SectionTitle>리그 순위</SectionTitle>
      {preview.leaguePositions.map((position) => (
        <div
          key={position.team.shortName}
          className="border-border-soft flex items-center gap-2.5 border-b py-2"
        >
          <span className="text-body text-text-strong w-8 shrink-0 font-black">
            {position.rank}위
          </span>
          <TeamProfileLink
            team={position.team}
            className="hover:text-accent flex min-w-0 flex-1 items-center gap-2 transition-colors"
          >
            <LiveCrest team={position.team} size={18} />
            <span className="text-body text-text-strong truncate font-bold">
              {position.team.name}
            </span>
          </TeamProfileLink>
          <span className="text-label text-text-3 shrink-0">
            승점 {position.points}, 득실{" "}
            {position.goalDiff > 0
              ? `+${position.goalDiff}`
              : position.goalDiff}
          </span>
        </div>
      ))}
    </section>
  );
}

function LastLineups({ preview }: { preview: MatchPreview }) {
  return (
    <section>
      <SectionTitle>직전 경기 선발</SectionTitle>
      {/* "직전 경기의 확정 선발" 문구는 명세가 요구하는 FE 표기다 — 지우지 말 것 */}
      <p className="text-label text-text-4 pb-2">
        예상 라인업이 아니라 직전 경기의 확정 선발이에요
      </p>
      {preview.lastLineups.map((lineup) => (
        <div key={lineup.team.shortName} className="pb-3">
          <p className="flex items-center gap-2 pb-1">
            <TeamProfileLink
              team={lineup.team}
              className="hover:text-accent flex items-center gap-1.75 transition-colors"
            >
              <LiveCrest team={lineup.team} size={18} />
              <span className="text-body text-text-strong font-bold">
                {lineup.team.name}
              </span>
            </TeamProfileLink>
            <span className="text-label text-accent font-bold">
              {lineup.formation}
            </span>
          </p>
          <p className="text-label text-text-3 leading-body">
            {lineup.playerNames.join(", ")}
          </p>
        </div>
      ))}
    </section>
  );
}
