import type { LiveTeam } from "@plick/domain/live";
import {
  formatPredictionPercent,
  PREDICTION_PICKS,
  predictionPercentOf,
  predictionPickLabel,
  type PredictionDistribution,
  type PredictionPick,
} from "@plick/domain/prediction";
import { CheckIcon } from "./icons";
import { LiveCrest } from "./LiveCrest";

/**
 * 승부예측 3분할 바 (KAN-696, 시안 가이드 §5.1). 한 줄을 홈, 무, 원정 세 칸으로 나누고 칸
 * 사이는 2px이다. 홈은 딥 그린에 흰 글자, 무승부는 회색 면, 원정은 밝은 초록이다. 초록 두 톤과
 * 회색만 쓰고 다른 색을 섞지 않는다. 칸 안은 엠블럼(무승부는 `무`)과 값이고 내 픽 칸은 값 뒤에
 * 체크가 붙는다. 색만으로 가르지 않게 칸마다 엠블럼이나 글자가 들어간다.
 *
 * 비공개(`revealed: false`)면 세 칸이 같은 폭에 `?%`다. 서버가 분포를 주지 않으므로 숫자를
 * 만들지 않는다. 공개된 분포가 모두 0%면 폭만 균등하게 채우고 숫자는 0%를 유지한다.
 * 참여가 0명이고 예측 전이면 바 대신 빈 면 한 줄이다.
 *
 * `onPick`을 넘기면 칸이 버튼이 된다 (KAN-710). 예측 탭이 OPEN에 예측 전일 때 넘겨서 칸을 누르면
 * 그 픽이 골라진 작성 시트가 열린다. 그때는 참여 0명이어도 빈 면 대신 `?%` 세 칸을 그려 누를 자리를
 * 둔다. 버튼 셋을 `role="img"` 안에 넣을 수 없어 묶음은 `role="group"`이고 분포 설명은 묶음의
 * 라벨, 칸마다 `맨시티 승 예측하기` 같은 라벨이 붙는다.
 *
 * 폭은 `flex: {비율} 1 0px`이고 최소 폭을 둬서 작은 칸에도 글자가 들어간다. 마운트 때 균등에서
 * 실제 비율로 퍼지는 등장(`animate-seg`, 칸마다 60ms 지연)과, 예측 직후 `?%`에서 실제 비율로
 * 바뀔 때의 `transition`을 함께 둔다. 움직임 줄이기 설정이면 둘 다 끈다.
 *
 * 앱과 웹이 같은 자리에 같은 모양을 그려 처음부터 공용이다(ADR 0011). 모서리는 `rounded-tile`
 * 토큰이라 웹 `globals.css`가 0으로 덮어 각지게 나온다. 높이와 최소 폭만 `size`로 가른다.
 *
 * @param home 홈 팀
 * @param away 원정 팀
 * @param distribution 분포. 비공개면 null
 * @param myPick 내 픽. 없으면 null
 * @param totalCount 참여 수. 비공개면 null
 * @param size `sm`은 앱과 웹 홈 카드(32px), `lg`는 웹 경기 상세(36px)
 * @param onPick 칸을 눌렀을 때. 넘기면 칸이 버튼이 되고, 없으면 읽기 전용 그림이다
 */
export function PredictionBar({
  home,
  away,
  distribution,
  myPick,
  totalCount,
  size = "sm",
  className = "",
  onPick,
}: {
  home: LiveTeam;
  away: LiveTeam;
  distribution: PredictionDistribution | null;
  myPick: PredictionPick | null;
  totalCount: number | null;
  size?: "sm" | "lg";
  className?: string;
  onPick?: (pick: PredictionPick) => void;
}) {
  const revealed = distribution !== null;
  const hasVotes =
    distribution !== null &&
    (distribution.home > 0 || distribution.draw > 0 || distribution.away > 0);
  if (!revealed && totalCount === 0 && !onPick) {
    return (
      <div
        aria-hidden
        className={`bg-border rounded-tile ${size === "lg" ? "h-9" : "h-8"} ${className}`}
      />
    );
  }

  const teams = { home: home.name, away: away.name };
  const label = barLabel(distribution, home, away);
  const segments = PREDICTION_PICKS.map((pick, i) => {
    const percent = predictionPercentOf(distribution, pick);
    const mine = myPick === pick;
    const segmentClass = `flex items-center justify-center transition-[flex-grow] duration-600 ease-out motion-reduce:animate-none motion-reduce:transition-none ${
      size === "lg" ? "min-w-16 gap-1.25" : "min-w-14.5 gap-1"
    } ${i > 0 ? "ml-0.5" : ""} ${SEGMENT_TONE[pick]} ${
      revealed ? "animate-seg" : ""
    }`;
    const style = {
      flex: `${hasVotes ? Math.max(percent ?? 0, 0) : 1} 1 0px`,
      animationDelay: `${i * 60}ms`,
    };
    const body = (
      <>
        {pick === "DRAW" ? (
          <span
            aria-hidden
            className={`font-bold ${size === "lg" ? "text-label" : "text-caption"}`}
          >
            무
          </span>
        ) : (
          <LiveCrest
            team={pick === "HOME" ? home : away}
            size={size === "lg" ? 16 : 14}
            decorative
          />
        )}
        <span
          className={`font-bold tabular-nums motion-reduce:animate-none ${
            size === "lg" ? "text-body" : "text-label"
          } ${revealed ? "animate-seg-label" : ""}`}
        >
          {formatPredictionPercent(percent)}
        </span>
        {mine && <CheckIcon size={13} role="img" aria-label="내 예측" />}
      </>
    );
    return onPick ? (
      <button
        key={pick}
        type="button"
        aria-label={`${predictionPickLabel(pick, teams)} 예측하기`}
        onClick={() => onPick(pick)}
        className={`${segmentClass} focus-visible:outline-accent focus-visible:outline-2 focus-visible:-outline-offset-2 active:opacity-80`}
        style={style}
      >
        {body}
      </button>
    ) : (
      <div key={pick} className={segmentClass} style={style}>
        {body}
      </div>
    );
  });

  const frame = `rounded-tile flex overflow-hidden ${
    size === "lg" ? "h-9" : "h-8"
  } ${className}`;
  return onPick ? (
    <div role="group" aria-label={label} className={frame}>
      {segments}
    </div>
  ) : (
    <div role="img" aria-label={label} className={frame}>
      {segments}
    </div>
  );
}

/** 칸 색. 홈 딥 그린, 무승부 회색, 원정 밝은 초록(시안 가이드 §5.1 표). */
const SEGMENT_TONE: Record<PredictionPick, string> = {
  HOME: "bg-accent text-on-accent",
  DRAW: "bg-border-strong text-text-strong",
  AWAY: "bg-accent-bright text-text-strong",
};

/** 스크린리더용 한 줄. 비공개면 비율을 말하지 않는다. */
function barLabel(
  distribution: PredictionDistribution | null,
  home: LiveTeam,
  away: LiveTeam,
): string {
  if (!distribution) return `${home.name} 대 ${away.name} 예측 분포, 비공개`;
  return `${home.name} 승 ${distribution.home}%, 무승부 ${distribution.draw}%, ${away.name} 승 ${distribution.away}%`;
}
