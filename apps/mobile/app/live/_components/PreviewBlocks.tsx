import { groupAbsenteesByTeam } from "@plick/domain/live";
import type { MatchPreview } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 킥오프 전 프리뷰 블록 묶음(피그마 L5, KAN-567 톤). 결장자, 상대 전적, 리그 순위 세 블록이다.
 * 각 블록은 비어 있으면 그리지 않는다(서버가 조각 실패 시 그 조각만 빼고 내리는 구조).
 *
 * 프리뷰 탭(`PreviewTab`)이 팀 비교 아래 이걸 다 펼쳐 그리고, 연기 경기처럼 탭이 없는 지면은
 * `MatchDetailScreen`이 바로 그린다. KAN-709에서 예측 탭에 합쳐질 때 "프리뷰 더 보기" 토글 안에
 * 접혀 있었는데 KAN-729에서 탭이 다시 갈라지며 토글은 없어졌다. "직전 경기 선발" 블록은 KAN-709에서
 * 지웠다.
 *
 * 시안에 프리뷰 화면은 없어 다른 탭과 같은 어법으로 맞췄다. 채운 면 카드 대신
 * 15/900 섹션 제목과 행 구분선이다.
 *
 * @param preview 프리뷰 블록
 * @param className 바깥 여백. 기본은 좌우 `px-edge`에 아래 24다
 */
export function PreviewBlocks({
  preview,
  className = "px-edge pb-6",
}: {
  preview: MatchPreview;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      {preview.absentees.length > 0 && <Absentees preview={preview} />}
      {preview.headToHead.length > 0 && <HeadToHead preview={preview} />}
      {preview.leaguePositions.length > 0 && (
        <LeaguePositions preview={preview} />
      )}
    </div>
  );
}

/**
 * 프리뷰 섹션 제목(15/900). 팀 비교(KAN-699, `PreviewTab`)도 같은 제목을 쓴다.
 *
 * @param className 위아래 여백을 바꿀 때
 */
export function PreviewSectionTitle({
  children,
  className = "pt-4.5 pb-1.5",
}: {
  children: string;
  className?: string;
}) {
  return (
    <h2
      className={`text-body-lg text-text-strong tracking-section font-black ${className}`}
    >
      {children}
    </h2>
  );
}

/** 결장자는 팀별로 묶어 홈 그룹부터 보여준다 (KAN-459). 팀 줄 아래에 선수 줄이 붙는다. */
function Absentees({ preview }: { preview: MatchPreview }) {
  return (
    <section>
      <PreviewSectionTitle>결장자</PreviewSectionTitle>
      {groupAbsenteesByTeam(preview.absentees).map((group) => (
        <div key={group.team.shortName} className="pb-2">
          <p className="flex items-center gap-2 py-1.5">
            <TeamProfileLink
              team={group.team}
              className="flex items-center gap-1.5 active:opacity-70"
            >
              <LiveCrest team={group.team} size={16} decorative />
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
                  absentee.kind === "SUSPENSION"
                    ? "text-danger-strong"
                    : "text-warn"
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

/**
 * 상대 전적. 날짜, 홈 팀명, 스코어, 원정 팀명, 결과 다섯 칸이다 (KAN-709). 전에는 "AS 3 - 2 맨체스"
 * 한 줄이었는데 h2h 응답에 코드가 없어 한글 팀명이 앞 세 글자로 잘렸다. 팀명 두 칸은 `min-w-0
 * truncate`로 넘치면 말줄임하고 가운데 스코어는 고정폭이라 행 높이(한 줄, py-2)는 그대로다.
 */
function HeadToHead({ preview }: { preview: MatchPreview }) {
  return (
    <section>
      <PreviewSectionTitle>상대 전적</PreviewSectionTitle>
      {preview.headToHead.map((game) => (
        <div
          key={`${game.date}-${game.homeName}-${game.awayName}`}
          className="border-border-soft flex items-center gap-2 border-b py-2"
        >
          <span className="text-caption-lg text-text-4 w-14 shrink-0">
            {game.date}
          </span>
          <span className="text-label-lg text-text min-w-0 flex-1 truncate text-right font-medium">
            {game.homeName}
          </span>
          <span className="text-label-lg text-text-strong w-12 shrink-0 text-center font-bold tabular-nums">
            {game.homeGoals} - {game.awayGoals}
          </span>
          <span className="text-label-lg text-text min-w-0 flex-1 truncate font-medium">
            {game.awayName}
          </span>
          <span
            className={`text-caption-lg w-5 shrink-0 text-center font-black ${
              game.result === "W"
                ? "text-accent"
                : game.result === "L"
                  ? "text-danger-strong"
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
      <PreviewSectionTitle>리그 순위</PreviewSectionTitle>
      {preview.leaguePositions.map((position) => (
        <div
          key={position.team.shortName}
          className="border-border-soft flex items-center gap-2.5 border-b py-2"
        >
          <TeamProfileLink
            team={position.team}
            className="flex min-w-0 flex-1 items-center gap-2 active:opacity-70"
          >
            <LiveCrest team={position.team} size={20} decorative />
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
