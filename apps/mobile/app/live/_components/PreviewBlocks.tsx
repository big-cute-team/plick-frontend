import { groupAbsenteesByTeam } from "@plick/domain/live";
import type { MatchPreview } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 킥오프 전 프리뷰 지면(피그마 L5, KAN-567 톤). 결장자·상대전적·리그 순위·직전 경기
 * 선발 네 블록. 각 블록은 비어 있으면 그리지 않는다(서버가 조각 실패 시
 * 그 조각만 빼고 내리는 구조).
 *
 * 시안에 프리뷰 화면은 없어 다른 탭과 같은 어법으로 맞췄다. 채운 면 카드 대신
 * 15/900 섹션 제목과 행 구분선이다.
 *
 * @param preview 프리뷰 블록
 */
export function PreviewBlocks({ preview }: { preview: MatchPreview }) {
  return (
    <div className="px-edge flex flex-col pb-6">
      {preview.absentees.length > 0 && <Absentees preview={preview} />}
      {preview.headToHead.length > 0 && <HeadToHead preview={preview} />}
      {preview.leaguePositions.length > 0 && (
        <LeaguePositions preview={preview} />
      )}
      {preview.lastLineups.length > 0 && <LastLineups preview={preview} />}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-body-lg text-text-strong tracking-section pt-4.5 pb-1.5 font-black">
      {children}
    </h2>
  );
}

/** 결장자는 팀별로 묶어 홈 그룹부터 보여준다 (KAN-459). 팀 줄 아래에 선수 줄이 붙는다. */
function Absentees({ preview }: { preview: MatchPreview }) {
  return (
    <section>
      <SectionTitle>결장자</SectionTitle>
      {groupAbsenteesByTeam(preview.absentees).map((group) => (
        <div key={group.team.shortName} className="pb-2">
          <p className="flex items-center gap-2 py-1.5">
            <TeamProfileLink
              team={group.team}
              className="flex items-center gap-1.5 active:opacity-70"
            >
              <LiveCrest team={group.team} size={16} />
              <span className="text-body text-text-strong font-bold">
                {group.team.name}
              </span>
            </TeamProfileLink>
            <span className="text-caption-lg text-text-3">
              {group.players.length}명
            </span>
          </p>
          {group.players.map((absentee) => (
            <div
              key={absentee.playerName}
              className="border-border-soft flex items-center gap-2.5 border-b py-2"
            >
              <PlayerPhoto
                src={absentee.photo}
                name={absentee.playerName}
                size={28}
              />
              <span className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
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
      <SectionTitle>상대 전적</SectionTitle>
      {preview.headToHead.map((game) => (
        <div
          key={`${game.date}-${game.line}`}
          className="border-border-soft flex items-center gap-2 border-b py-2"
        >
          <span className="text-caption-lg text-text-4 w-14 shrink-0">
            {game.date}
          </span>
          <span className="text-label-lg text-text flex-1 text-center font-medium">
            {game.line}
          </span>
          <span
            className={`text-caption-lg w-5 shrink-0 text-center font-black ${
              game.result === "W"
                ? "text-accent"
                : game.result === "L"
                  ? "text-danger"
                  : "text-text-4"
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
          <TeamProfileLink
            team={position.team}
            className="flex min-w-0 flex-1 items-center gap-2 active:opacity-70"
          >
            <LiveCrest team={position.team} size={20} />
            <span className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
              {position.team.name}
            </span>
          </TeamProfileLink>
          <span className="text-body text-text-strong font-black">
            {position.rank}위
          </span>
          <span className="text-caption-lg text-text-3">
            승점 {position.points}, {position.goalDiff > 0 ? "+" : ""}
            {position.goalDiff}
          </span>
          <span aria-hidden className="flex gap-0.5">
            {position.recentForm.map((result, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full ${
                  result === "W"
                    ? "bg-accent"
                    : result === "L"
                      ? "bg-form-loss"
                      : "bg-muted"
                }`}
              />
            ))}
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
      {/* "직전 경기의 확정 선발" 문구는 명세가 요구하는 FE 표기다. 지우지 말 것 */}
      <p className="text-caption-lg text-text-3 pb-1">
        예상 라인업이 아니라 직전 경기의 확정 선발이에요
      </p>
      {preview.lastLineups.map((lineup) => (
        <div
          key={lineup.team.shortName}
          className="border-border-soft border-b py-2.5"
        >
          <p className="flex items-center gap-2 pb-1">
            <TeamProfileLink
              team={lineup.team}
              className="flex items-center gap-1.5 active:opacity-70"
            >
              <LiveCrest team={lineup.team} size={16} />
              <span className="text-body text-text-strong font-bold">
                {lineup.team.name}
              </span>
            </TeamProfileLink>
            <span className="text-caption-lg text-text-3">
              {lineup.formation}
            </span>
          </p>
          <p className="text-label-lg text-text leading-body">
            {lineup.playerNames.join(", ")}
          </p>
        </div>
      ))}
    </section>
  );
}
