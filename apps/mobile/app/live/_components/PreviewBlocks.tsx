import type { MatchPreview } from "@plick/domain/live";
import { LiveCrest } from "./LiveCrest";
import { PlayerPhoto } from "./PlayerPhoto";

/**
 * 킥오프 전 프리뷰 지면(피그마 L5) — 결장자·상대전적·리그 순위·직전 경기
 * 선발 네 블록. 각 블록은 비어 있으면 그리지 않는다(서버가 조각 실패 시
 * 그 조각만 빼고 내리는 구조).
 */
export function PreviewBlocks({ preview }: { preview: MatchPreview }) {
  return (
    <div className="px-edge flex flex-col gap-3 pb-6">
      {preview.absentees.length > 0 && <Absentees preview={preview} />}
      {preview.headToHead.length > 0 && <HeadToHead preview={preview} />}
      {preview.leaguePositions.length > 0 && (
        <LeaguePositions preview={preview} />
      )}
      {preview.lastLineups.length > 0 && <LastLineups preview={preview} />}
    </div>
  );
}

function Absentees({ preview }: { preview: MatchPreview }) {
  return (
    <section className="bg-elevate rounded-card flex flex-col gap-2.5 p-4">
      <h2 className="text-body text-text-2 font-bold">결장자</h2>
      {preview.absentees.map((absentee) => (
        <div
          key={`${absentee.team.shortName}-${absentee.playerName}`}
          className="flex items-center gap-2.5"
        >
          <LiveCrest team={absentee.team} size={18} />
          <PlayerPhoto
            src={absentee.photo}
            name={absentee.playerName}
            size={28}
          />
          <span className="text-body text-text min-w-0 flex-1 truncate font-semibold">
            {absentee.playerName}
          </span>
          <span
            className={`rounded-badge text-micro px-2 py-1 font-bold ${
              absentee.kind === "SUSPENSION"
                ? "bg-danger/15 text-danger"
                : "bg-warn-tint text-warn"
            }`}
          >
            {absentee.reason}
          </span>
        </div>
      ))}
    </section>
  );
}

function HeadToHead({ preview }: { preview: MatchPreview }) {
  return (
    <section className="bg-elevate rounded-card flex flex-col gap-2.5 p-4">
      <h2 className="text-body text-text-2 font-bold">
        상대 전적 · 최근 5경기
      </h2>
      {preview.headToHead.map((game) => (
        <div
          key={`${game.date}-${game.line}`}
          className="flex items-center gap-2"
        >
          <span className="text-caption text-text-4 w-14 shrink-0">
            {game.date}
          </span>
          <span className="text-label text-text-2 flex-1 text-center font-semibold">
            {game.line}
          </span>
          <span
            className={`rounded-badge text-micro grid size-5 shrink-0 place-items-center font-bold ${
              game.result === "W"
                ? "bg-accent-tint text-accent"
                : game.result === "L"
                  ? "bg-danger/15 text-danger"
                  : "bg-elevate-2 text-text-3"
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
    <section className="bg-elevate rounded-card flex flex-col gap-2.5 p-4">
      <h2 className="text-body text-text-2 font-bold">리그 순위</h2>
      {preview.leaguePositions.map((position) => (
        <div
          key={position.team.shortName}
          className="flex items-center gap-2.5"
        >
          <LiveCrest team={position.team} size={20} />
          <span className="text-body text-text min-w-0 flex-1 truncate font-semibold">
            {position.team.name}
          </span>
          <span className="text-body text-text font-bold">
            {position.rank}위
          </span>
          <span className="text-caption text-text-4">
            승점 {position.points} ·{" "}
            {position.goalDiff > 0
              ? `+${position.goalDiff}`
              : position.goalDiff}
          </span>
          <span aria-hidden className="flex gap-0.5">
            {position.recentForm.map((result, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full ${
                  result === "W"
                    ? "bg-accent"
                    : result === "L"
                      ? "bg-danger"
                      : "bg-text-4"
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
    <section className="bg-elevate rounded-card flex flex-col gap-3 p-4">
      {/* "직전 경기의 확정 선발" 문구는 명세가 요구하는 FE 표기다 — 지우지 말 것 */}
      <div className="flex flex-col gap-1">
        <h2 className="text-body text-text-2 font-bold">직전 경기 선발</h2>
        <p className="text-caption text-text-4">
          예상 라인업이 아니라 직전 경기의 확정 선발이에요
        </p>
      </div>
      {preview.lastLineups.map((lineup) => (
        <div key={lineup.team.shortName} className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2">
            <LiveCrest team={lineup.team} size={16} />
            <span className="text-label text-text font-bold">
              {lineup.team.name}
            </span>
            <span className="bg-accent-tint text-accent rounded-badge text-micro px-1.5 py-0.5 font-bold">
              {lineup.formation}
            </span>
          </p>
          <p className="text-caption text-text-3 leading-body">
            {lineup.playerNames.join(" · ")}
          </p>
        </div>
      ))}
    </section>
  );
}
