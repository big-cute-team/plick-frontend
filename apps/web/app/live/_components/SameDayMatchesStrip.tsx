"use client";

import Link from "next/link";
import {
  kickoffDateKey,
  matchStatusLabel,
  type MatchStatusTone,
  type MatchSummary,
} from "@plick/domain/live";
import { useMatches } from "@/_hooks/useMatches";
import { LiveCrest } from "./LiveCrest";

/** 로딩 중 자리 개수 — 카드 폭이 고정이라 실제 개수와 무관하게 줄 높이만 지킨다. */
const SKELETON_COUNT = 4;

/** 상태 줄의 톤 → 색 토큰(목록 카드와 같은 규약). */
const TONE_TEXT: Record<MatchStatusTone, string> = {
  live: "text-danger",
  scheduled: "text-text-3",
  finished: "text-text-4",
  postponed: "text-warn",
};

/**
 * 상세 헤더 아래 "같은 날 다른 경기" 스트립 (KAN-462, 네이버 스포츠 상세의
 * 경기 카드 줄). 지금 경기가 속한 날(KST)의 목록을 작은 카드로 가로 나열하고
 * 지금 경기는 accent 테두리로 표시한다. 다른 카드를 누르면 그 상세로 간다.
 *
 * 목록은 대시보드와 같은 `useMatches` 쿼리라 캐시를 나눠 쓴다(대시보드에서
 * 들어왔으면 즉시 그려진다). 씨앗은 없다 — 상세 응답이 와야 날짜를 알 수
 * 있어 서버에서 직렬로 한 번 더 기다리는 대신 클라가 받는다. 그날 경기가 이
 * 경기뿐이거나 실패하면 줄 자체를 접는다(상세를 막을 이유가 없다).
 *
 * @param header 지금 경기 헤더 — 날짜와 강조할 id
 */
export function SameDayMatchesStrip({ header }: { header: MatchSummary }) {
  const date = kickoffDateKey(header.kickoffAt);
  const { data, isPending } = useMatches(date);

  if (isPending) {
    return (
      <div className="flex gap-2.5 overflow-hidden" aria-hidden>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div
            key={i}
            className="bg-elevate rounded-card h-24 w-52 shrink-0 animate-pulse"
          />
        ))}
      </div>
    );
  }
  if (!data || data.length < 2) return null;

  return (
    <nav
      aria-label="같은 날 다른 경기"
      className="no-scrollbar flex gap-2.5 overflow-x-auto"
    >
      {data.map((match) => (
        <StripCard
          key={match.id}
          match={match}
          current={match.id === header.id}
        />
      ))}
    </nav>
  );
}

function StripCard({
  match,
  current,
}: {
  match: MatchSummary;
  current: boolean;
}) {
  const { primary, tone } = matchStatusLabel(match);
  return (
    <Link
      href={`/live/matches/${match.id}`}
      aria-current={current ? "page" : undefined}
      className={`bg-elevate rounded-card focus-visible:outline-accent flex w-52 shrink-0 flex-col gap-2 border px-4 py-3 transition-colors focus-visible:outline-2 ${
        current
          ? "border-accent"
          : "hover:border-border-strong border-transparent"
      }`}
    >
      <span className={`text-label font-bold ${TONE_TEXT[tone]}`}>
        {primary}
      </span>
      <StripTeam match={match} side="home" />
      <StripTeam match={match} side="away" />
    </Link>
  );
}

function StripTeam({
  match,
  side,
}: {
  match: MatchSummary;
  side: "home" | "away";
}) {
  const team = match[side];
  const score = match.score[side];
  return (
    <span className="flex items-center gap-2">
      <LiveCrest team={team} size={20} />
      <span
        className={`text-body min-w-0 flex-1 truncate font-semibold ${team.code ? "text-text" : "text-text-3"}`}
      >
        {team.shortName}
      </span>
      <span className="text-body-lg text-text font-bold">{score ?? "-"}</span>
    </span>
  );
}
