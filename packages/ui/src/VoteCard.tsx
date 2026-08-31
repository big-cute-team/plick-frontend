"use client";

import {
  formatDebateCloseAt,
  formatDebateTimeLeft,
} from "@plick/domain/format";
import type { Debate, VoteOption } from "@plick/domain/types";

/**
 * 선택지 한 쪽의 트랙 스타일 — A는 초록(accent), B는 파랑(info). 시안 규칙대로
 * 색은 면(fill)으로만 쓰고 테두리는 없다(ADR 0108). 틴트 20%는 투표 전 배경과
 * 결과의 상대편 바가 함께 쓴다.
 */
const SIDE_STYLE: Record<VoteOption, { fill: string; tint: string }> = {
  OPTION_A: { fill: "bg-accent", tint: "bg-accent/20" },
  OPTION_B: { fill: "bg-info", tint: "bg-info/20" },
};

/**
 * 투표 카드 (KAN-418) — 시안 V3(투표 전/후)·T1·W13~W15의 공용 카드.
 *
 * "오늘의 투표" 배지 + 남은 시간 + 질문 + 상하 스택 트랙 2개 + 메타 라인.
 * 투표 전과 후가 같은 DOM이고 fill 폭·높이·색만 트랜지션해 시안의 모프
 * 애니메이션이 그대로 나온다(ADR 0108) — 좌우 2버튼 레이아웃을 쓰지 않는 이유다.
 *
 * 상태·뮤테이션은 소유하지 않는다(PostBadges처럼 표시 전용). 결과 공개는
 * 내 투표(myVote) 또는 마감이 게이트고, 마감이면 투표 없이도 결과를 보여준다.
 *
 * 마감 여부도 스스로 판정하지 않는다 — 실기준이 `closesAt` 시각이 아니라 기사
 * `contentType`(FINISH)이라 기사 상세·릴 세부가 각자 판정해 `closed`로 넘긴다.
 * 토론 리스트에는 BE가 열린 토론만 내려주므로 안 넘기면 진행 중으로 그린다.
 *
 * @param debate - 토론 데이터. 집계 갱신은 호출부가 이 객체를 갈아 끼운다.
 * @param closed - 마감된 토론인가(기사 `contentType === "FINISH"`).
 * @param onVote - 트랙 탭 시 호출. 없으면 표시 전용(리스트 카드)으로 그린다.
 * @param isPending - 투표 요청 진행 중 — 트랙 탭을 막는다.
 * @param size - 기사·릴 세부는 md, 토론 리스트 카드는 sm.
 */
export function VoteCard({
  debate,
  closed = false,
  onVote,
  isPending = false,
  size = "md",
}: {
  debate: Debate;
  closed?: boolean;
  onVote?: (option: VoteOption) => void;
  isPending?: boolean;
  size?: "md" | "sm";
}) {
  const showResults = closed || debate.myVote !== null;
  const total = debate.voteCountA + debate.voteCountB;
  const pctA = total === 0 ? 0 : Math.round((debate.voteCountA / total) * 100);
  // 100-pctA로 만들면 0표 마감에서 B가 100%로 튄다 — 0표는 양쪽 다 0%다
  const pctB = total === 0 ? 0 : 100 - pctA;

  const timeLeft = closed ? null : formatDebateTimeLeft(debate.closesAt);
  const interactive = Boolean(onVote) && !closed;

  return (
    <section
      aria-label="투표"
      className={`bg-elevate rounded-card flex flex-col ${size === "md" ? "gap-3 p-4" : "gap-2.5 p-3.5"}`}
    >
      <header className="flex items-center justify-between">
        {/* "오늘의 투표" 대신 상태 배지 (사용자 피드백) — 마감이면 톤을 죽인다 */}
        <span
          className={`rounded-badge tracking-label text-micro px-1.5 py-0.5 font-extrabold ${
            closed ? "bg-elevate-2 text-text-3" : "bg-accent text-on-accent"
          }`}
        >
          {closed ? "마감" : "진행 중"}
        </span>
        {timeLeft && (
          /* 남은 시간은 렌더 시각에서 파생돼 서버·클라가 분 단위로 어긋날 수
             있다 — 릴의 상대 시각과 같은 이유로 하이드레이션 경고를 끈다 */
          <span suppressHydrationWarning className="text-caption text-text-3">
            {timeLeft}
          </span>
        )}
      </header>

      <h3
        className={`text-text font-extrabold ${size === "md" ? "text-title" : "text-body-lg"}`}
      >
        {debate.topic}
      </h3>

      <div className="flex flex-col gap-2" role={onVote ? "group" : undefined}>
        {(["OPTION_A", "OPTION_B"] as const).map((option) => (
          <VoteTrack
            key={option}
            option={option}
            label={option === "OPTION_A" ? debate.optionA : debate.optionB}
            pct={option === "OPTION_A" ? pctA : pctB}
            count={
              option === "OPTION_A" ? debate.voteCountA : debate.voteCountB
            }
            mine={debate.myVote === option}
            showResults={showResults}
            closed={closed}
            size={size}
            onVote={interactive ? () => onVote?.(option) : undefined}
            locked={isPending || debate.myVote === option}
          />
        ))}
      </div>

      {/* 마감 시각 표기("오늘 …")도 렌더 시각 파생이라 위와 같은 이유 */}
      <p suppressHydrationWarning className="text-caption text-text-4">
        {closed
          ? `마감 · ${total.toLocaleString()}명 투표`
          : showResults
            ? `${total.toLocaleString()}명 참여 · ${
                debate.closesAt
                  ? `${formatDebateCloseAt(debate.closesAt)} 마감`
                  : "내 투표 반영됨"
              }`
            : `${total.toLocaleString()}명 참여 · 투표하면 결과가 열려요`}
      </p>
    </section>
  );
}

/**
 * 선택지 트랙 하나. 투표 전(틴트 100%)과 결과(득표율 폭)가 같은 요소라 폭·높이·
 * 색 트랜지션으로 모프된다. 내 선택은 솔리드 + 높이 확대(시안의 1.22배 대응).
 *
 * 인터랙티브 카드에서는 상태와 무관하게 항상 button을 그린다 — 투표 직후 내
 * 트랙만 div로 갈아타면 React가 DOM을 새로 만들어 모프 트랜지션이 그 자리에서
 * 끊긴다. 재탭 차단은 요소 교체가 아니라 `locked` 가드로 한다.
 */
function VoteTrack({
  option,
  label,
  pct,
  count,
  mine,
  showResults,
  closed,
  size,
  onVote,
  locked = false,
}: {
  option: VoteOption;
  label: string;
  pct: number;
  /** 이 선택지의 득표수 — 결과 공개 상태에서 라벨 아래 "N표"로 보인다 */
  count: number;
  mine: boolean;
  showResults: boolean;
  closed: boolean;
  size: "md" | "sm";
  onVote?: () => void;
  /** 응답 대기 중이거나 이미 내 선택인 트랙 — 눌러도 무시한다 */
  locked?: boolean;
}) {
  const side = SIDE_STYLE[option];
  // 결과 상태는 득표수 줄이 붙어 두 줄이 된다 — 투표 전보다 한 단씩 키운다
  const height = showResults
    ? size === "md"
      ? mine
        ? "h-15"
        : "h-13"
      : mine
        ? "h-13"
        : "h-11"
    : size === "md"
      ? "h-11"
      : "h-9";

  const body = (
    <>
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 transition-all duration-800 ease-out ${
          mine ? side.fill : side.tint
        } ${closed ? "opacity-60" : ""}`}
        style={{ width: showResults ? `${pct}%` : "100%" }}
      />
      <span
        className={`relative flex min-w-0 flex-col justify-center ${
          mine ? "text-on-accent" : "text-text"
        }`}
      >
        <span
          className={`truncate font-bold ${mine ? "font-extrabold" : ""} ${size === "md" ? "text-body" : "text-label"}`}
        >
          {/* "내 선택" 라벨은 뺐다(사용자 피드백) — 체크와 솔리드 필이 이미 말한다 */}
          {mine ? `✓ ${label}` : label}
        </span>
        {showResults && (
          <span
            className={`${size === "md" ? "text-caption" : "text-micro"} font-semibold ${
              mine ? "text-on-accent/80" : "text-text-2"
            }`}
          >
            {count.toLocaleString()}표
          </span>
        )}
      </span>
      {showResults && (
        <span
          className={`text-text relative shrink-0 font-bold ${size === "md" ? "text-body" : "text-label"}`}
        >
          {pct}%
        </span>
      )}
    </>
  );

  const trackClass = `rounded-control relative flex w-full items-center justify-between gap-2 overflow-hidden bg-elevate-2 text-left transition-[height] duration-800 ease-out ${height} ${size === "md" ? "px-3.5" : "px-3"}`;

  if (!onVote) {
    return (
      <div
        className={trackClass}
        aria-label={`${label}${mine ? " (내 선택)" : ""}`}
      >
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        if (!locked) onVote();
      }}
      disabled={closed}
      aria-pressed={mine}
      className={`${trackClass} cursor-pointer`}
    >
      {body}
    </button>
  );
}
