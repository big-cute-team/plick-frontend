"use client";

import { useEffect, useState } from "react";
import {
  formatDebateCloseAt,
  formatDebateTimeLeft,
  isDebateClosed,
} from "@plick/domain/format";
import type { Debate, VoteOption } from "@plick/domain/types";

/**
 * 선택지 한 쪽의 트랙 색 (KAN-567 시안 "투표 카드"). A는 딥 그린, B는 밝은 그린이다.
 * 진한 fill은 내 선택, tint는 투표 전 바탕과 상대편 결과 바가 쓴다. 글자색은
 * 진한 fill 위에서만 바뀐다(A 흰색, B 짙은 초록).
 */
const SIDE_STYLE: Record<
  VoteOption,
  { fill: string; tint: string; on: string }
> = {
  OPTION_A: { fill: "bg-vote-a", tint: "bg-vote-a-tint", on: "text-vote-a-on" },
  OPTION_B: { fill: "bg-vote-b", tint: "bg-vote-b-tint", on: "text-vote-b-on" },
};

/**
 * 투표 카드 (KAN-418, 시안 KAN-567) — 기사·릴 세부, 투표 탭, MY 투표 탭, 웹 릴 패널의 공용 카드.
 *
 * 상태 배지 + 남은 시간 + 질문 + 상하 스택 트랙 2개 + 메타 라인.
 * 투표 전과 후가 같은 DOM이고 fill 폭·높이·색만 `.8s ease-out`으로 전환해 시안의 모프
 * 애니메이션이 그대로 나온다(ADR 0108) — 좌우 2버튼 레이아웃을 쓰지 않는 이유다.
 *
 * 라운드는 토큰(`rounded-card`·`rounded-tile`·`rounded-badge`)이라 웹은 globals.css의
 * 토큰 덮어쓰기로 각지게, 앱은 둥글게 나온다.
 *
 * 상태·뮤테이션은 소유하지 않는다(표시 전용). 결과 공개는 내 투표(myVote) 또는
 * 마감이 게이트고, 마감이면 투표 없이도 결과를 보여준다. 재투표는 가능하고 같은 쪽을
 * 다시 누르면 무시한다(`locked`).
 *
 * 마감 판정은 두 겹이다 (KAN-436). 기사 `contentType`(FINISH) 마감은 호출부가
 * `closed`로 넘기고, `closesAt` 경과는 카드가 스스로 판정해 OR로 겹친다 — BE가
 * closesAt 도달로 FINISH 전환을 하지 않아 시각만 지난 토론이 실존하기 때문이다(KAN-437).
 *
 * @param debate - 토론 데이터. 집계 갱신은 호출부가 이 객체를 갈아 끼운다.
 * @param closed - 마감된 토론인가(기사 `contentType === "FINISH"`).
 * @param onVote - 트랙 탭 시 호출. 없으면 표시 전용(리스트 카드)으로 그린다.
 * @param isPending - 투표 요청 진행 중 — 트랙 탭을 막는다.
 * @param size - 기사·릴 세부와 투표 탭 진행 중은 md, 마감 행과 MY 투표 탭은 sm.
 */
export function VoteCard({
  debate,
  closed: contentClosed = false,
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
  /* closesAt 경과 마감. 마감은 시간상 단조라(서버 렌더가 마감이면 더 늦은
     하이드레이션도 마감) 초기값을 렌더 시점 판정으로 둬도 하이드레이션이
     안전하고, 열린 채 떠 있는 카드는 타이머가 마감 시각에 그 자리에서 잠근다 */
  const [pastClose, setPastClose] = useState(() =>
    isDebateClosed(debate.closesAt),
  );
  useEffect(() => {
    if (pastClose || !debate.closesAt) return;
    const left = new Date(debate.closesAt).getTime() - Date.now();
    // setTimeout 지연은 32비트 한계가 있다 — 그보다 먼 마감(24일+)은 이 세션에서 닿지 않는다
    if (left > 0x7fffffff) return;
    const timer = setTimeout(() => setPastClose(true), Math.max(left, 0));
    return () => clearTimeout(timer);
  }, [debate.closesAt, pastClose]);

  const closed = contentClosed || pastClose;
  const showResults = closed || debate.myVote !== null;
  const total = debate.voteCountA + debate.voteCountB;
  const pctA = total === 0 ? 0 : Math.round((debate.voteCountA / total) * 100);
  // 100-pctA로 만들면 0표 마감에서 B가 100%로 튄다 — 0표는 양쪽 다 0%다
  const pctB = total === 0 ? 0 : 100 - pctA;

  const timeLeft = closed ? null : formatDebateTimeLeft(debate.closesAt);
  const interactive = Boolean(onVote) && !closed;
  const md = size === "md";

  return (
    <section
      aria-label="투표"
      className={`bg-vote-card rounded-card flex flex-col ${md ? "gap-3 p-4" : "gap-2.5 p-3.5"}`}
    >
      <header className="flex items-center justify-between">
        <span
          className={`rounded-badge tracking-label text-micro inline-flex h-5 items-center px-1.5 font-black ${
            closed
              ? "bg-vote-closed text-vote-closed-on"
              : "bg-accent text-on-accent"
          }`}
        >
          {closed ? "마감" : "진행 중"}
        </span>
        {timeLeft && (
          /* 남은 시간은 렌더 시각에서 파생돼 서버·클라가 분 단위로 어긋날 수
             있다 — 릴의 상대 시각과 같은 이유로 하이드레이션 경고를 끈다 */
          <span
            suppressHydrationWarning
            className="text-caption text-vote-closed-on"
          >
            {timeLeft}
          </span>
        )}
      </header>

      <h3
        className={`text-text-strong tracking-heading leading-[1.4] font-black text-pretty ${md ? "text-title" : "text-body-lg"}`}
      >
        {debate.topic}
      </h3>

      <div
        className="flex flex-col gap-1.5"
        role={onVote ? "group" : undefined}
      >
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

      {/* 마감 시각 표기도 렌더 시각 파생이라 위와 같은 이유 */}
      <p suppressHydrationWarning className="text-caption text-text-4">
        {closed
          ? `${total.toLocaleString()}명 참여, 마감`
          : showResults && debate.closesAt
            ? `${total.toLocaleString()}명 참여, ${formatDebateCloseAt(debate.closesAt)} 마감`
            : `${total.toLocaleString()}명 참여`}
      </p>
    </section>
  );
}

/**
 * 선택지 트랙 한 줄. 높이(md/sm)는 투표 전 36/32, 결과 40/36, 내 선택 44/40이다.
 * 바탕은 `bg-vote-track`이고 그 위에 absolute fill 층을 깐다. 투표 전에는 fill이
 * 각자의 tint로 폭 100%, 투표 후에는 폭이 득표율이 된다. 내 선택은 진한 fill에
 * `✓ 라벨`(900), 나머지는 tint다. 마감이면 fill 불투명도를 .6으로 낮춘다.
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
  locked,
}: {
  option: VoteOption;
  label: string;
  pct: number;
  count: number;
  mine: boolean;
  showResults: boolean;
  closed: boolean;
  size: "md" | "sm";
  onVote?: () => void;
  locked: boolean;
}) {
  const style = SIDE_STYLE[option];
  const md = size === "md";
  const height = !showResults
    ? md
      ? "h-9"
      : "h-8"
    : mine
      ? md
        ? "h-11"
        : "h-10"
      : md
        ? "h-10"
        : "h-9";
  const Tag = onVote ? "button" : "div";

  return (
    <Tag
      type={onVote ? "button" : undefined}
      onClick={onVote}
      disabled={onVote ? locked : undefined}
      aria-pressed={onVote ? mine : undefined}
      className={`rounded-tile bg-vote-track relative flex w-full items-center gap-2 overflow-hidden text-left transition-[height] duration-[800ms] ease-out ${height} ${md ? "px-3.25" : "px-3"} ${onVote ? "cursor-pointer" : ""}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 transition-[width,background-color] duration-[800ms] ease-out ${
          showResults && mine ? style.fill : style.tint
        } ${closed ? "opacity-60" : ""}`}
        style={{ width: showResults ? `${pct}%` : "100%" }}
      />
      <span className="relative flex min-w-0 flex-1 items-baseline gap-1.5">
        <span
          className={`truncate ${md ? "text-body" : "text-label-lg"} ${
            showResults && mine
              ? `font-black ${style.on}`
              : "text-text-strong font-bold"
          }`}
        >
          {showResults && mine ? `✓ ${label}` : label}
        </span>
        {showResults && (
          <span
            className={`text-caption shrink-0 font-semibold ${
              mine ? style.on : "text-text-3"
            }`}
          >
            {count.toLocaleString()}표
          </span>
        )}
      </span>
      {showResults && (
        <span
          className={`relative shrink-0 font-bold ${md ? "text-body" : "text-label-lg"} ${
            mine ? style.on : "text-text-strong"
          }`}
        >
          {pct}%
        </span>
      )}
    </Tag>
  );
}
