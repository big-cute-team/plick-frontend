import {
  predictionHomeFooter,
  predictionHomeVerdict,
  predictionKickoffLabel,
  predictionStatusLine,
  predictionTeamLabel,
  type PredictionHomeCard as PredictionHomeCardData,
} from "@plick/domain/prediction";
import { ParticipationStatus } from "./ParticipationStatus";
import { LiveCrest } from "./LiveCrest";
import { PredictionBar } from "./PredictionBar";
import { OpinionTeaser } from "./OpinionTeaser";

/**
 * 홈 승부예측 카드 한 장 (KAN-700, 시안 가이드 §5.2). 위에서 아래로 킥오프(`오늘 22:30`)와 상태,
 * 팀 줄(이름 + 엠블럼, `vs`, 엠블럼 + 이름), 3분할 바, 대표 의견 한 줄, 참여 수다. 면은 `elevate`
 * 토큰이고 모서리는 `rounded-card`라 웹에서 각지다. 테두리는 없다.
 *
 * 대표 의견은 닉네임 굵게에 본문 말줄임이다. 예측 전에는 실제 본문 대신
 * 블러 실루엣과 참여 안내를 표시한다. 의견 자리는 빈 상태에도 같은 높이를 유지한다.
 * 트랙의 링크 높이에 맞춰 늘어나고 참여 수를 하단에 두어 의견 유무에 관계없이 카드 끝을 맞춘다.
 * 바는 예측 탭과 같은 `PredictionBar`라 비공개면 `?%` 균등이고 참여 0명이면 빈 면이다.
 *
 * 카드 어디를 눌러도 그 경기 예측 탭으로 간다. 링크는 앱이 `next/link`로 감싸고 여기는 모양만 그린다.
 * 팀명은 BE가 사전의 전체 이름(맨체스터 유나이티드)을 주므로 빅6는 레지스트리의 짧은 한글 표기로,
 * 그 밖은 그대로 쓰고 말줄임한다. 카드가 `overflow-hidden`에 `min-w-0`이라 긴 의견이 폭을 밀지 않는다.
 *
 * @param card 홈 카드
 * @param size `sm`은 앱(엠블럼 36, 패딩 14), `lg`는 웹(엠블럼 32, 패딩 16)
 * @param now 킥오프 `오늘` 판정 기준. 테스트가 고정값을 넣는다
 */
export function PredictionHomeCard({
  card,
  size = "sm",
  now,
}: {
  card: PredictionHomeCardData;
  size?: "sm" | "lg";
  now?: Date;
}) {
  const teams = {
    home: predictionTeamLabel(card.home),
    away: predictionTeamLabel(card.away),
  };
  const statusLine = predictionStatusLine(card, teams);
  const verdict = predictionHomeVerdict(card);
  const crest = size === "lg" ? 32 : 36;

  return (
    <div
      className={`bg-elevate rounded-card flex w-full min-w-0 flex-col overflow-hidden ${
        size === "lg" ? "px-4 pt-4 pb-2" : "px-3.5 pt-3.5 pb-2.5"
      }`}
    >
      {card.status === "OPEN" && (
        <div className="mb-2">
          <ParticipationStatus label="예측 중" closesAt={card.kickoffAt} />
        </div>
      )}
      <div className="flex items-baseline gap-1.5">
        {/* 홈은 20초 ISR이라 서버 HTML이 자정 전, 하이드레이션이 자정 뒤일 수 있다. 그 한 프레임의 `오늘`
            불일치는 경고를 끄고 두면 마운트 뒤 재조회가 다시 그려 맞춘다 */}
        <span
          suppressHydrationWarning
          className="text-label text-text-3 tabular-nums"
        >
          {predictionKickoffLabel(card.kickoffAt, now)}
        </span>
        <span className="flex-1" />
        {statusLine && (
          <span
            className={`text-label min-w-0 truncate font-bold tabular-nums ${
              card.status === "LOCKED" || card.status === "SETTLED"
                ? "text-text-strong"
                : "text-text-3"
            }`}
          >
            {statusLine}
          </span>
        )}
        {verdict && (
          <span
            className={`text-label shrink-0 font-bold ${
              verdict === "적중" ? "text-accent" : "text-text-4"
            }`}
          >
            {verdict}
          </span>
        )}
      </div>

      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center py-3.5 ${
          size === "lg" ? "gap-2.5" : "gap-3"
        }`}
      >
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="text-body-lg text-text-strong truncate font-bold">
            {teams.home}
          </span>
          <LiveCrest team={card.home} size={crest} decorative />
        </span>
        <span aria-hidden className="text-label text-text-4">
          vs
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <LiveCrest team={card.away} size={crest} decorative />
          <span className="text-body-lg text-text-strong truncate font-bold">
            {teams.away}
          </span>
        </span>
      </div>

      {card.status !== "UPCOMING" && (
        <PredictionBar
          home={card.home}
          away={card.away}
          distribution={card.distribution}
          myPick={card.myPick}
          totalCount={card.totalCount}
        />
      )}

      {card.status !== "UPCOMING" && (
        <OpinionTeaser locked={!card.revealed} opinion={card.topOpinion} />
      )}

      <p
        className={`text-label text-text-3 mt-auto flex items-center tabular-nums ${
          size === "lg" ? "min-h-9" : "min-h-10"
        }`}
      >
        <span
          key={predictionHomeFooter(card)}
          className="animate-rise inline-block motion-reduce:animate-none"
        >
          {predictionHomeFooter(card)}
        </span>
      </p>
    </div>
  );
}
