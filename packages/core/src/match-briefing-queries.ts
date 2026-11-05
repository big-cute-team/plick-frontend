"use client";

/**
 * @file AI 경기 브리핑 쿼리 훅 (KAN-724). 두 앱의 예측 탭이 같은 훅으로 카드 유무를 정한다.
 *
 * 조회 정책: 예정, 진행, 종료 경기에서 받는다. 주기 재조회(폴링)는 없다. 킥오프 전 예정 경기는
 * staleTime 60초라 탭을 오가거나 창에 돌아올 때 60초가 지났으면 다시 받고, 킥오프 뒤로는 한 번 받은
 * 값을 그대로 쓴다 (KAN-735). retry 0.
 *
 * 처음엔 예정 경기에서 60초마다 다시 받았다. 기사가 수정되거나 비공개가 되면 서버가 바로 UNAVAILABLE로
 * 바꾸던 때의 장치인데, 그 규칙이 빠진 뒤(KAN-732)로 킥오프 전 브리핑이 바뀌는 건 하루 한 번 배치
 * (KAN-734)뿐이라 걷었다. 조회는 생성 trigger가 아니다. 서버는 저장값만 읽으므로 LLM 토큰을 쓰지 않는다.
 *
 * 실패는 전부 "카드 없음"이다. 전역 에러 토스트나 페이지 에러로 올리지 않는다. 모바일은 데이터가
 * 없는 쿼리 실패를 경계로 던지는 기본값(`QueryProvider`)이 있어 `throwOnError: false`로 끈다. 쿼리는
 * 뮤테이션의 `meta.errorHandled` 안전망을 타지 않으므로 이 한 줄이 그 역할이다.
 */

import { useQuery } from "@tanstack/react-query";
import {
  isMatchBriefingEligible,
  isMatchBriefingVisible,
  matchBriefingStaleTime,
  type MatchBriefing,
  type MatchBriefingHost,
} from "@plick/domain/match-briefing";
import { getMatchBriefing } from "./match-briefings";
import { matchBriefingKeys } from "./matchBriefingKeys";

/**
 * 이 경기 화면에 지금 보여 줄 브리핑. 없으면 null이고 화면은 카드를 세우지 않는다.
 *
 * 예정, 진행, 종료 경기에서 받는다(`enabled`). 취소와 연기 경기는 요청도 보내지 않는다. 서버가
 * READY를 주는 동안은 킥오프나 서버 만료 시각이 지나도 카드를 닫지 않는다. 처음엔 그 시각에 타이머를
 * 걸어 닫았는데(`useDeadlineClock`) KAN-735에서 걷었다.
 *
 * `staleTime`은 함수로 넘긴다. 쿼리 라이브러리가 값을 물을 때마다(마운트, 창 포커스) 현재 시각으로
 * 다시 판정하므로 렌더에서 시계를 읽지 않고 타이머도 따로 두지 않는다. 값은 도메인의
 * `matchBriefingStaleTime`이 정한다. 킥오프 전에는 60초, 킥오프를 넘기면 `Infinity`다. 예정 경기의 상세는 폴링되지 않아 화면을 켜 둔 채 킥오프를 넘기면 헤더가
 * SCHEDULED로 남는데, 시각도 같이 보므로 그때부터는 탭을 오가거나 창에 돌아와도 다시 받지 않는다.
 * 데이터 없이 실패한 쿼리는 낡은 것으로 쳐서 포커스 때 한 번 더 시도한다.
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
    staleTime: () => matchBriefingStaleTime(host, Date.now()),
    refetchOnWindowFocus: true,
    retry: 0,
    throwOnError: false,
  });
  const briefing = data ?? null;
  return briefing && isMatchBriefingVisible(briefing, host) ? briefing : null;
}
