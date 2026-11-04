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
 * 팀 줄(이름 + 엠블럼, `vs`, 엠블럼 + 이름), 3분할 바, 대표 의견 한 줄, 참여 수다. 모서리는
 * `rounded-card`라 웹에서 각지다. 테두리는 없다.
 *
 * `tone`이 `accent`면 시안의 딥 그린 카드다(KAN-714). 면이 `bg-accent`에 글자가 전부 흰색이고, 3분할
 * 바의 홈 칸은 흰 면에 초록 글자로 바뀐다. 면 위에 빛줄기 두 개(`animate-beam-left`, `-right`)를
 * 깔아 주기가 다른 회전이 엇갈리며 훑는다. 줄기는 `-z-10`이라 내용 아래 깔리고 카드가 `isolate`로
 * 쌓임 맥락을 만들어 면 위에는 선다. 움직임 줄이기 설정이면 멈춘 각도로 둔다. 크기와 구조는
 * 중립 톤과 같다. 티켓이 색과 배경 애니메이션만 바꾸라 했다. 기본 톤은 `bg-elevate`의 회색 카드다
 * (VS 승부예측 목록).
 *
 * 대표 의견은 닉네임 굵게에 본문 말줄임이고 여럿이면 3초마다 넘어간다(`OpinionTeaser`). 예측 전에는
 * 닉네임은 보이고 본문만 흐리다. 의견 자리는 빈 상태에도 같은 높이를 유지한다. 트랙의 링크 높이에
 * 맞춰 늘어나고 참여 수를 하단에 두어 의견 유무에 관계없이 카드 끝을 맞춘다. 바는 예측 탭과 같은
 * `PredictionBar`라 비공개면 `?%` 균등이고 참여 0명이면 빈 면이다.
 *
 * 카드 어디를 눌러도 그 경기 예측 탭으로 간다. 링크는 앱이 `next/link`로 감싸고 여기는 모양만 그린다.
 * 팀명은 BE가 사전의 전체 이름(맨체스터 유나이티드)을 주므로 빅6는 레지스트리의 짧은 한글 표기로,
 * 그 밖은 그대로 쓰고 말줄임한다. 카드가 `overflow-hidden`에 `min-w-0`이라 긴 의견이 폭을 밀지 않는다.
 *
 * @param card 홈 카드
 * @param size `sm`은 앱(엠블럼 36, 패딩 14), `lg`는 웹(엠블럼 32, 패딩 16)
 * @param tone `neutral`은 회색 면, `accent`는 딥 그린 면과 스포트라이트
 * @param now 킥오프 `오늘` 판정 기준. 테스트가 고정값을 넣는다
 */
export function PredictionHomeCard({
  card,
  size = "sm",
  tone = "neutral",
  now,
}: {
  card: PredictionHomeCardData;
  size?: "sm" | "lg";
  tone?: "neutral" | "accent";
  now?: Date;
}) {
  const teams = {
    home: predictionTeamLabel(card.home),
    away: predictionTeamLabel(card.away),
  };
  const statusLine = predictionStatusLine(card, teams);
  const verdict = predictionHomeVerdict(card);
  const crest = size === "lg" ? 32 : 36;
  const accent = tone === "accent";
  const strong = accent ? "text-on-accent" : "text-text-strong";
  const muted = accent ? "text-on-accent/80" : "text-text-3";

  return (
    <div
      className={`rounded-card relative isolate flex w-full min-w-0 flex-col overflow-hidden ${
        accent ? "bg-accent" : "bg-elevate"
      } ${size === "lg" ? "px-4 pt-4 pb-2" : "px-3.5 pt-3.5 pb-2.5"}`}
    >
      {accent && (
        <>
          <span
            aria-hidden
            className="via-beam animate-beam-left pointer-events-none absolute -top-10 left-[14%] -z-10 h-80 w-24 origin-top bg-linear-to-r from-transparent to-transparent motion-reduce:-rotate-20 motion-reduce:animate-none"
          />
          <span
            aria-hidden
            className="via-beam animate-beam-right pointer-events-none absolute -top-10 right-[14%] -z-10 h-80 w-24 origin-top bg-linear-to-r from-transparent to-transparent motion-reduce:rotate-20 motion-reduce:animate-none"
          />
        </>
      )}
      {card.status === "OPEN" && (
        <div className="mb-2">
          <ParticipationStatus
            label="예측 중"
            closesAt={card.kickoffAt}
            tone={tone}
          />
        </div>
      )}
      <div className="flex items-baseline gap-1.5">
        {/* 홈은 20초 ISR이라 서버 HTML이 자정 전, 하이드레이션이 자정 뒤일 수 있다. 그 한 프레임의 `오늘`
            불일치는 경고를 끄고 두면 마운트 뒤 재조회가 다시 그려 맞춘다 */}
        <span
          suppressHydrationWarning
          className={`text-label tabular-nums ${accent ? "text-on-accent font-medium" : "text-text-3"}`}
        >
          {predictionKickoffLabel(card.kickoffAt, now)}
        </span>
        <span className="flex-1" />
        {statusLine && (
          <span
            className={`text-label min-w-0 truncate font-bold tabular-nums ${
              accent || card.status === "LOCKED" || card.status === "SETTLED"
                ? strong
                : "text-text-3"
            }`}
          >
            {statusLine}
          </span>
        )}
        {verdict && (
          <span
            className={`text-label shrink-0 font-bold ${
              accent
                ? verdict === "적중"
                  ? "text-on-accent"
                  : "text-on-accent/80"
                : verdict === "적중"
                  ? "text-accent"
                  : "text-text-4"
            }`}
          >
            {verdict}
          </span>
        )}
      </div>

      {/* 앱은 팀 줄 위아래를 14에서 10으로 줄였다 (KAN-709). 홈 첫 화면에 아래 소식이 더 가까워지게 */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ${
          size === "lg" ? "gap-2.5 py-3.5" : "gap-3 py-2.5"
        }`}
      >
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className={`text-body-lg truncate font-bold ${strong}`}>
            {teams.home}
          </span>
          <LiveCrest team={card.home} size={crest} decorative />
        </span>
        <span
          aria-hidden
          className={`text-label ${accent ? "text-on-accent/60" : "text-text-4"}`}
        >
          vs
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <LiveCrest team={card.away} size={crest} decorative />
          <span className={`text-body-lg truncate font-bold ${strong}`}>
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
          onAccent={accent}
        />
      )}

      {card.status !== "UPCOMING" && (
        <OpinionTeaser
          locked={!card.revealed}
          opinions={card.opinions}
          tone={tone}
        />
      )}

      <p
        className={`text-label mt-auto flex items-center tabular-nums ${muted} ${
          size === "lg" ? "min-h-9" : "min-h-8"
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
