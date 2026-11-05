"use client";

/**
 * @file AI 경기 브리핑 쿼리 훅 (KAN-724). 두 앱의 예측 탭이 같은 훅으로 카드 유무를 정한다.
 *
 * 조회 정책: 예정, 진행, 종료 경기에서 받는다. 킥오프 전 예정 경기는 staleTime 60초에 60초 재조회,
 * 그 뒤로는 재조회 없이 한 번 받은 값을 그대로 쓴다 (KAN-735). retry 0, 창 포커스 때 재조회.
 * 킥오프 전 재조회는 생성 trigger가 아니라 서버 배치가 매일 다시 만든 요약(KAN-734)이나
 * UNAVAILABLE로 바뀐 것을 알아채는 용도다. 서버는 저장값만 읽으므로 조회가 아무리 잦아도 LLM 토큰을
 * 쓰지 않는다.
 *
 * 실패는 전부 "카드 없음"이다. 전역 에러 토스트나 페이지 에러로 올리지 않는다. 모바일은 데이터가
 * 없는 쿼리 실패를 경계로 던지는 기본값(`QueryProvider`)이 있어 `throwOnError: false`로 끈다. 쿼리는
 * 뮤테이션의 `meta.errorHandled` 안전망을 타지 않으므로 이 한 줄이 그 역할이다.
 */

import { useQuery } from "@tanstack/react-query";
import {
  isMatchBriefingEligible,
  isMatchBriefingPrematch,
  isMatchBriefingVisible,
  type MatchBriefing,
  type MatchBriefingHost,
} from "@plick/domain/match-briefing";
import { getMatchBriefing } from "./match-briefings";
import { matchBriefingKeys } from "./matchBriefingKeys";

/** 킥오프 전 브리핑을 신선하게 보는 시간이자 재조회 간격(ms). 티켓 고정값 60초. */
export const MATCH_BRIEFING_REFRESH_MS = 60_000;

/**
 * 이 경기 화면에 지금 보여 줄 브리핑. 없으면 null이고 화면은 카드를 세우지 않는다.
 *
 * 예정, 진행, 종료 경기에서 받는다(`enabled`). 취소와 연기 경기는 요청도 보내지 않는다. 서버가
 * READY를 주는 동안은 킥오프나 서버 만료 시각이 지나도 카드를 닫지 않는다. 처음엔 그 시각에 타이머를
 * 걸어 닫았는데(`useDeadlineClock`) KAN-735에서 걷었다.
 *
 * `staleTime`과 `refetchInterval`은 함수로 넘긴다. 쿼리 라이브러리가 값을 물을 때마다 현재 시각으로
 * 다시 판정하므로 렌더에서 시계를 읽지 않고 타이머도 따로 두지 않는다. 화면을 켜 둔 채 킥오프를
 * 넘기면 그 뒤 첫 응답에서 간격이 false로 바뀌어 재조회가 멈춘다. 그때부터 받은 값은 낡지 않아
 * (`Infinity`) 탭을 오가거나 창에 돌아와도 다시 받지 않는다. 데이터 없이 실패한 쿼리는 낡은 것으로
 * 쳐서 포커스 때 한 번 더 시도한다.
 *
 * 경기를 옮기면 키가 갈려 이전 경기의 값이 새 경기에 보이지 않고, fetcher가 경기 id가 다른 응답을
 * null로 접는다.
 *
 * @param host 경기 헤더(id, 상태, 킥오프). `MatchSummary`를 그대로 넘기면 된다
 */
export function useMatchBriefing(
  host: MatchBriefingHost,
): MatchBriefing | null {
  const { data } = useQuery<MatchBriefing | null>({
    queryKey: matchBriefingKeys.match(host.id),
    queryFn: () => getMatchBriefing(host.id),
    enabled: isMatchBriefingEligible(host.status),
    staleTime: () =>
      isMatchBriefingPrematch(host, Date.now())
        ? MATCH_BRIEFING_REFRESH_MS
        : Infinity,
    refetchInterval: () =>
      isMatchBriefingPrematch(host, Date.now())
        ? MATCH_BRIEFING_REFRESH_MS
        : false,
    refetchOnWindowFocus: true,
    retry: 0,
    throwOnError: false,
  });
  const briefing = data ?? null;
  return briefing && isMatchBriefingVisible(briefing, host) ? briefing : null;
}
