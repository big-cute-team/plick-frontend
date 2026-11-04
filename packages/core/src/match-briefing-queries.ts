"use client";

/**
 * @file AI 경기 브리핑 쿼리 훅 (KAN-724). 두 앱의 예측/프리뷰 탭이 같은 훅으로 카드 유무를 정한다.
 *
 * 조회 정책(티켓 고정값): staleTime 60초, 예정 경기에서만 60초 재조회, retry 0, 창 포커스 때 재조회.
 * 60초 재조회는 생성 trigger가 아니라 기사 비공개·수정·경기 상태 변화로 서버가 UNAVAILABLE로 바꾼
 * 것을 알아채는 용도다. 서버는 저장값만 읽으므로 조회가 아무리 잦아도 LLM 토큰을 쓰지 않는다.
 *
 * 실패는 전부 "카드 없음"이다. 전역 에러 토스트나 페이지 에러로 올리지 않는다. 모바일은 데이터가
 * 없는 쿼리 실패를 경계로 던지는 기본값(`QueryProvider`)이 있어 `throwOnError: false`로 끈다. 쿼리는
 * 뮤테이션의 `meta.errorHandled` 안전망을 타지 않으므로 이 한 줄이 그 역할이다.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  isMatchBriefingVisible,
  matchBriefingDeadline,
  type MatchBriefing,
  type MatchBriefingHost,
} from "@plick/domain/match-briefing";
import { getMatchBriefing } from "./match-briefings";
import { matchBriefingKeys } from "./matchBriefingKeys";

/** 브리핑을 신선하게 보는 시간이자 예정 경기의 재조회 간격(ms). 티켓 고정값 60초. */
export const MATCH_BRIEFING_REFRESH_MS = 60_000;

/** `setTimeout` 지연 상한. 32비트를 넘기면 브라우저가 0으로 접어 바로 깨운다. */
const MAX_TIMEOUT_MS = 0x7fffffff;

/**
 * 감출 시각이 오면 한 번 다시 그리게 하는 시계. `deadline`(epoch ms)에 맞춰 타이머를 걸고 그때의
 * 현재 시각을 돌려준다. 화면을 보고 있는 동안 만료나 킥오프에 도달하면 카드가 그 자리에서 사라진다.
 * 서버가 다음 재조회에서 UNAVAILABLE을 주기 전에도 FE 가드가 먼저 닫는다.
 *
 * 상한보다 먼 기한은 상한에서 한 번 깨어나 다시 잰다. 일찍 깨어난 때는 아직 기한 전이라
 * {@link isMatchBriefingVisible}이 그대로 true다.
 *
 * @param deadline 감출 시각. null이면 타이머를 걸지 않는다
 */
function useDeadlineClock(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null || !Number.isFinite(deadline)) return;
    const wait = deadline - Date.now();
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(wait, 0), MAX_TIMEOUT_MS),
    );
    return () => clearTimeout(timer);
  }, [deadline, now]);
  return now;
}

/**
 * 이 경기 화면에 지금 보여 줄 브리핑. 없으면 null이고 화면은 카드를 세우지 않는다.
 *
 * SCHEDULED 경기에서만 받는다(`enabled`). 라이브·종료·연기 경기는 요청도 보내지 않는다. 받은 뒤에도
 * 서버 만료와 실제 킥오프 중 이른 시각에 타이머를 걸어 그 시각이 오면 바로 숨긴다. 경기를 옮기면
 * 키가 갈려 이전 경기의 값이 새 경기에 보이지 않고, fetcher가 경기 id가 다른 응답을 null로 접는다.
 *
 * @param host 경기 헤더(id, 상태, 킥오프). `MatchSummary`를 그대로 넘기면 된다
 */
export function useMatchBriefing(
  host: MatchBriefingHost,
): MatchBriefing | null {
  const scheduled = host.status === "SCHEDULED";
  const { data } = useQuery<MatchBriefing | null>({
    queryKey: matchBriefingKeys.match(host.id),
    queryFn: () => getMatchBriefing(host.id),
    enabled: scheduled,
    staleTime: MATCH_BRIEFING_REFRESH_MS,
    refetchInterval: scheduled ? MATCH_BRIEFING_REFRESH_MS : false,
    refetchOnWindowFocus: true,
    retry: 0,
    throwOnError: false,
  });
  const briefing = data ?? null;
  const deadline =
    briefing && scheduled
      ? matchBriefingDeadline(briefing, host.kickoffAt)
      : null;
  const now = useDeadlineClock(deadline);
  return briefing && isMatchBriefingVisible(briefing, host, now)
    ? briefing
    : null;
}
