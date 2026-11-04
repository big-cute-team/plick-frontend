import { groupAbsenteesByTeam } from "@plick/domain/live";
import type { MatchPreview } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PlayerLink } from "@/_components/PlayerLink";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 킥오프 전 프리뷰 (KAN-462 → KAN-567 톤 정리). 왼쪽에 결장자, 상대전적, 오른쪽에
 * 리그 순위를 둔다. 시안 웹 규칙대로 본문 카드에 면과 테두리를 두르지 않고 섹션 제목
 * 14/900과 여백으로 끊는다. 각 블록은 비어 있으면 그리지 않는다(서버가 조각 실패 시
 * 그 조각만 빼고 내리는 구조).
 *
 * 프리뷰 탭은 이 묶음이 아니라 `PreviewPanel`이 세 블록을 팀 비교와 함께 다시 배치해 그린다. 연기
 * 경기처럼 탭이 없는 지면만 이걸 쓴다. "직전 경기 선발" 블록은 KAN-709에서 지웠다.
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
      </div>
    </div>
  );
}

/**
 * 프리뷰 섹션 제목(14/900). 팀 비교(KAN-699, `PreviewPanel`)도 같은 제목을 쓴다.
 *
 * @param className 위아래 여백을 바꿀 때
 */
export function PreviewSectionTitle({
  children,
  className = "pt-4.5 pb-2",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-body-md text-text-strong font-black ${className}`}>
      {children}
    </p>
  );
}

/**
 * 결장자는 팀별로 묶어 홈 그룹부터 보여준다 (KAN-459). 팀 줄 아래에 선수 줄이 붙는다.
 *
 * @param preview 프리뷰
 * @param titleClassName 제목 여백. 2단에서 옆 팀 비교 표와 윗선을 맞출 때 넘긴다
 * @param split 팀 그룹 둘을 좌우로 나란히 놓는다. 프리뷰 탭이 2단 아래 전체 폭으로 펼칠 때
 *   (KAN-710) 한 줄이 1000px 넘게 늘어지지 않게 한다. 좁은 폭에서는 다시 한 단이다
 */
export function Absentees({
  preview,
  titleClassName,
  split = false,
}: {
  preview: MatchPreview;
  titleClassName?: string;
  split?: boolean;
}) {
  return (
    <section className="min-w-0">
      <PreviewSectionTitle className={titleClassName}>
        결장자
      </PreviewSectionTitle>
      <div className={split ? "grid grid-cols-1 gap-x-10 md:grid-cols-2" : ""}>
        {groupAbsenteesByTeam(preview.absentees).map((group) => (
          <div key={group.team.shortName} className="pb-3">
            <p className="flex items-center gap-2 pb-1">
              <TeamProfileLink
                team={group.team}
                className="hover:text-accent flex items-center gap-1.75 transition-colors"
              >
                <LiveCrest team={group.team} size={18} decorative />
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
                <PlayerLink
                  playerId={absentee.playerId}
                  className="text-body text-text-strong min-w-0 flex-1 truncate font-medium"
                  linkClassName="hover:text-accent focus-visible:outline-accent transition-colors focus-visible:outline-2"
                >
                  {absentee.playerName}
                </PlayerLink>
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
      </div>
    </section>
  );
}

/**
 * 상대 전적, 최근 5경기. 날짜, 홈 팀명, 스코어, 원정 팀명, 결과 다섯 칸이다 (KAN-709). 전에는
 * "AS 3 - 2 맨체스" 한 줄이었는데 h2h 응답에 코드가 없어 한글 팀명이 앞 세 글자로 잘렸다. 팀명 두
 * 칸은 `min-w-0 truncate`로 넘치면 말줄임하고 가운데 스코어는 고정폭이라 행 높이(py-2)는 그대로다.
 *
 * @param preview 프리뷰
 * @param titleClassName 제목 여백. 2단 오른쪽 첫 블록으로 설 때 옆 팀 비교 표와 윗선을 맞춘다 (KAN-710)
 */
export function HeadToHead({
  preview,
  titleClassName,
}: {
  preview: MatchPreview;
  titleClassName?: string;
}) {
  return (
    <section className="min-w-0">
      <PreviewSectionTitle className={titleClassName}>
        상대 전적, 최근 5경기
      </PreviewSectionTitle>
      {preview.headToHead.map((game) => (
        <div
          key={`${game.date}-${game.homeName}-${game.awayName}`}
          className="border-border-soft flex items-center gap-2 border-b py-2"
        >
          <span className="text-label text-text-3 w-20 shrink-0">
            {game.date}
          </span>
          <span className="text-body text-text-strong min-w-0 flex-1 truncate text-right font-medium">
            {game.homeName}
          </span>
          <span className="text-body text-text-strong w-14 shrink-0 text-center font-bold tabular-nums">
            {game.homeGoals} - {game.awayGoals}
          </span>
          <span className="text-body text-text-strong min-w-0 flex-1 truncate font-medium">
            {game.awayName}
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

/** 양 팀의 리그 순위 요약. 순위, 팀, 승점과 득실 한 줄씩이다. */
export function LeaguePositions({ preview }: { preview: MatchPreview }) {
  return (
    <section className="min-w-0">
      <PreviewSectionTitle>리그 순위</PreviewSectionTitle>
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
            <LiveCrest team={position.team} size={18} decorative />
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
