"use client";

/**
 * @file 승부예측 읽기 쿼리 훅 일곱 개 (KAN-685. KAN-696~702가 두 앱 `_hooks/`에 바이트 단위로 같게
 * 복제해 둔 것을 에픽이 끝난 뒤 한 번에 올렸다. 판단은 ADR 0232).
 *
 * 읽기만 여기 있다. 쓰기 훅(등록·취소, 공감, 신고, 답글, 차단)은 앱의 서버 액션
 * (`_services/prediction-actions.ts`, 쿠키 이름이 앱에 박혀 있다)과 앱별 전역 에러 안전망
 * (`meta.errorHandled`)에 묶여 있어 ADR 0011 게이트 A를 못 넘는다. 앱 `_hooks/`에 그대로 둔다.
 *
 * 공통 구조: 익명 ISR 화면(홈, 경기 상세, 투표)은 서버가 토큰 없이 받아 둔 값을 씨앗(`initialData`)으로
 * 심어 첫 그림을 바로 그리고, 마운트되면 브라우저가 `/be` 프록시로 다시 받는다. 프록시가 HttpOnly
 * 쿠키의 토큰을 Bearer로 실어 주므로 그때 내 예측, 내 표, 잠금 여부, `likedByMe`가 그 사람 기준으로
 * 온다. 사용자별 값은 서버 HTML과 CloudFront 캐시에 들어가지 않는다. 캐시·재시도 정책 값은
 * `query-policy.ts`에 있다.
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  PREDICTION_DISTRIBUTION_REFRESH_MS,
  PREDICTION_RANKING_STALE_MS,
  type MyPredictionPage,
  type MyPredictionStats,
  type PredictionHomeCard,
  type PredictionOpinionSort,
  type PredictionPick,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { predictionKeys } from "./predictionKeys";
import {
  getMyPredictions,
  getMyPredictionStats,
  getPredictionHome,
  getPredictionFeed,
  getPredictionOpinions,
  getPredictionRankings,
  getPredictionReplies,
  getPredictionSummary,
} from "./predictions";
import {
  FEED_FRESH_MS,
  LIVE_MAX_RETRIES,
  retryUnlessClientError,
} from "./query-policy";
import { useFreshSeed } from "./useFreshSeed";

/**
 * 경기 하나의 예측 요약 쿼리 (KAN-696). 예측 탭 상단(상태 줄, 참여 수, 3분할 바, 내 예측)과
 * "예측 탭을 만들 경기인가"의 판정이 이 값에 걸린다.
 *
 * 경기 상세는 익명 ISR이라(KAN-683) 서버가 받아 둔 요약은 토큰 없이 받은 값이다. OPEN이면
 * `revealed: false`고 `myPrediction`도 없다. 그 값을 씨앗으로 심어 탭 유무와 첫 그림은 바로
 * 정하고, 마운트되면 브라우저가 다시 받는다(`useArticleDebate`와 같은 구조). `staleTime`이 0이라
 * 들어올 때마다 다시 받는다.
 *
 * OPEN과 LOCKED는 분포가 움직이는 상태라 30초마다 다시 받는다(BE 분포 캐시와 같은 간격, 가이드
 * §8). 정산·취소·미개장은 바뀔 게 없어 폴링하지 않는다.
 *
 * null은 404 `PREDICTION_NOT_AVAILABLE`(빅6 밖 경기)이라 탭을 만들지 않는다. 그 밖의 실패는
 * 씨앗이 남아 있으면 그대로 두고, 씨앗도 없으면 탭이 서지 않는다. 요약 하나 때문에 경기 화면이
 * 에러로 바뀌면 안 되므로 경계로 던지지 않는다.
 *
 * @param matchId 경기 id
 * @param initial 서버가 받아 둔 요약. null은 예측 없는 경기, undefined는 서버가 못 받은 것
 */
export function usePredictionSummary(
  matchId: number,
  initial: PredictionSummary | null | undefined,
) {
  return useQuery<PredictionSummary | null>({
    queryKey: predictionKeys.summary(matchId),
    queryFn: () => getPredictionSummary(matchId),
    ...(initial !== undefined && { initialData: initial }),
    staleTime: 0,
    retry: LIVE_MAX_RETRIES,
    throwOnError: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "OPEN" || status === "LOCKED"
        ? PREDICTION_DISTRIBUTION_REFRESH_MS
        : false;
    },
  });
}

/**
 * 홈 승부예측 카드 목록 쿼리 (KAN-700). 홈은 익명 ISR(20초)이라 서버 씨앗의 OPEN 카드는 전부
 * `revealed: false`에 `myPick`이 없다. 마운트되면 브라우저가 다시 받아 내 픽과 분포, 마이팀 우선
 * 순서가 그 사람 기준으로 온다.
 *
 * 예측 등록·취소 뒤에는 `invalidateAfterPredictionWrite`가 이 키를 다시 받는다. 홈 카드가
 * 화면에 보이는 동안에는 분포 캐시와 같은 30초 간격으로 갱신한다.
 *
 * 실패해도 홈이 에러로 바뀌면 안 되므로 경계로 던지지 않는다. 씨앗이 없고 실패하면 `undefined`라
 * 섹션이 실패 문구를 둔다.
 *
 * @param initial 서버가 받아 둔 카드 목록. 서버가 못 받았으면 undefined
 */
export function usePredictionHome(
  initial: PredictionHomeCard[] | undefined,
  visible = false,
) {
  return useQuery<PredictionHomeCard[]>({
    queryKey: predictionKeys.home(),
    refetchInterval: visible ? PREDICTION_DISTRIBUTION_REFRESH_MS : false,
    queryFn: () => getPredictionHome(),
    ...(initial !== undefined && { initialData: initial }),
    staleTime: 0,
    retry: LIVE_MAX_RETRIES,
    throwOnError: false,
  });
}

/**
 * 경기 하나의 의견 목록 무한 쿼리 (KAN-697, 시안 가이드 §5.4·§8). 예측 탭의 의견 자리가 쓴다.
 *
 * 정렬과 픽 필터가 쿼리 키에 들어가 바꾸면 다른 캐시를 본다. 커서는 정렬마다 다른 값이라
 * 다른 정렬의 커서를 보내면 400이 오는데(티켓 참고), 키가 갈리니 커서가 섞일 일이 없다. 예측
 * 등록·수정·취소 뒤에는 `predictionKeys.opinionsOf`로 정렬·필터를 가리지 않고 통째로 다시
 * 받는다(`usePredictionCompose`, `usePredictionCancel`).
 *
 * 브라우저에서만 받는다. 사람마다 다른 잠금 여부와 `likedByMe`를 서버에서 받지 않는다. BE가
 * 캐시하지 않는 값이라 `staleTime`은 0이다. 탭에 돌아올 때마다 새로 받는다.
 *
 * `locked: true`는 에러가 아니라 200 응답이다. OPEN에서 예측하지 않은 사용자가 그렇고 화면이
 * 잠금 지면을 그린다. 4xx는 다시 보내도 같은 답이라 순단만 재시도한다(`useComments`와 같다).
 *
 * @param matchId 경기 id
 * @param sort 정렬
 * @param pick 픽 필터. 전체면 null
 * @param enabled 의견 자리를 그리지 않을 때 끈다. 지금은 두 앱 모두 항상 켠다
 */
export function usePredictionOpinions(
  matchId: number,
  sort: PredictionOpinionSort,
  pick: PredictionPick | null,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: predictionKeys.opinions(matchId, sort, pick),
    queryFn: ({ pageParam }) =>
      getPredictionOpinions(matchId, { sort, pick, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: 0,
    retry: retryUnlessClientError(),
  });
}

/**
 * 의견 하나의 답글 목록 무한 쿼리 (KAN-698, 시안 가이드 §5.6·§8). 오래된 순이고 한 페이지 50건이라
 * 보통 한 번에 다 온다.
 *
 * 브라우저에서만 받는다. `likedByMe`와 `isMine`이 사람마다 달라 서버 HTML에 둘 수 없다. BE가
 * 캐시하지 않는 값이라 `staleTime`은 0이다. 답글 등록·삭제 뒤에는 `invalidateAfterReplyWrite`가
 * 통째로 다시 받고, 수정과 공감은 캐시를 바로 덮는다.
 *
 * OPEN에서 예측하지 않은 사용자가 의견을 직접 열면 403 `PREDICTION_LOCKED`, 없거나 가려진
 * 의견은 404로 온다. 4xx는 다시 보내도 같은 답이라 순단만 재시도한다.
 *
 * @param predictionId 의견 id
 * @param enabled 펼치기 전(웹)이나 원 의견을 못 받았을 때(앱)는 끈다
 */
export function usePredictionReplies(predictionId: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: predictionKeys.replies(predictionId),
    queryFn: ({ pageParam }) =>
      getPredictionReplies(predictionId, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: 0,
    /* 403 잠금과 404는 화면이 문구로 받는다. 앱 기본값(데이터 없는 실패는 경계로)을 끈다 */
    throwOnError: false,
    retry: retryUnlessClientError(),
  });
}

/**
 * 시즌 랭킹 무한 쿼리 (KAN-701, 시안 가이드 §5.7·§8). 투표 화면 랭킹 탭이 쓴다.
 *
 * 브라우저에서만 받는다. 투표 화면은 익명 ISR이라(KAN-667) 사람마다 다른 `me`(내 순위)를 서버에서
 * 받을 수 없고, 랭킹 탭은 기본 탭도 아니라 서버 HTML에 실을 이유가 없다. 소셜 계정이면 첫 페이지의
 * `me`가 채워지고 비로그인은 null이다. 게스트는 BE가 기록이 없는 사용자로 보고 `qualified: false`를
 * 준다.
 *
 * scope를 비워 BE가 이번 시즌을 고르게 하고(티켓 참고 "생략하면 이번 시즌") 응답의 `scope`로 시즌
 * 라벨을 적는다. BE가 10분 캐시하는 값이라 `staleTime`도 10분이다(`PREDICTION_RANKING_STALE_MS`).
 * 정산은 5분 배치라 그 사이 다시 받아도 같은 답이다. 4xx는 다시 보내도 같은 답이라 순단만 재시도한다.
 *
 * @param enabled 랭킹 탭이 보일 때만 켠다
 */
export function usePredictionRankings(enabled = true) {
  return useInfiniteQuery({
    queryKey: predictionKeys.rankings(),
    queryFn: ({ pageParam }) => getPredictionRankings({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: PREDICTION_RANKING_STALE_MS,
    retry: retryUnlessClientError(),
  });
}

/**
 * 내 적중률·순위·예측 수 쿼리 (KAN-700). 홈 승부예측 제목 오른쪽의 `128위`, MY 기록 상자, 모바일 MY의
 * 예측 랭킹 줄이 같은 키를 나눠 쓴다. `GET /me/prediction-stats`는 토큰이 없으면 401이라 소셜 계정일
 * 때만 켠다(`enabled`). 게스트와 비로그인은 부르지 않고 화면이 `랭킹`으로 둔다. 유저별 값이라 서버
 * 씨앗 없이 브라우저에서만 받고, 예측 등록·취소 뒤 `invalidateAfterPredictionWrite`가 상위 키
 * (`mine`)로 다시 받는다.
 *
 * 순위는 정산 때만 바뀌어 한 번 받으면 잠시 둬도 된다(`staleTime` 1분). 실패해도 홈을 에러로
 * 만들지 않고 `랭킹`으로 접는다.
 *
 * @param enabled 소셜 계정으로 로그인했는가
 */
export function useMyPredictionStats(enabled: boolean) {
  return useQuery<MyPredictionStats>({
    queryKey: predictionKeys.myStats(),
    queryFn: () => getMyPredictionStats(),
    enabled,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });
}

/**
 * 내 예측 기록 무한 쿼리 (KAN-702, 시안 가이드 §5.8·§8). MY 활동의 예측 탭이 쓴다. 순서는 서버가 준
 * 그대로다(결과 대기 먼저, 그다음 킥오프 역순).
 *
 * `GET /me/predictions`는 토큰이 없으면 401이라 소셜 계정만 부른다. 게스트는 BE가 기록 없는
 * 사용자로 보고 빈 목록을 주지만 화면은 부르지 않고 바로 빈 상태를 그린다(모바일
 * `MeActivityFeed`. 웹은 페이지가 게스트를 먼저 거른다). 커서 규약, 캐시 정책, 씨앗 우선은 내 댓글
 * (`useMyComments`)과 같다. 예측 등록·취소 뒤에는 `invalidateAfterPredictionWrite`가 상위 키
 * (`mine`)로 다시 받으니 여기서 더 할 일이 없다.
 *
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각. 예측 탭을 보고 있을 때만 있다
 */
export function useMyPredictions(initial?: {
  page: MyPredictionPage;
  fetchedAt: number;
}) {
  useFreshSeed(
    predictionKeys.myList(),
    initial && {
      data: { pages: [initial.page], pageParams: [null] },
      fetchedAt: initial.fetchedAt,
    },
  );

  return useInfiniteQuery({
    queryKey: predictionKeys.myList(),
    queryFn: ({ pageParam }) => getMyPredictions({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: initial
      ? { pages: [initial.page], pageParams: [null] }
      : undefined,
    initialDataUpdatedAt: initial
      ? () => Math.min(initial.fetchedAt, Date.now())
      : undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    refetchOnWindowFocus: false,
    throwOnError: false,
    retry: retryUnlessClientError(),
  });
}

/** VS 승부예측 목록. 마감 경기까지 이어지는 커서 목록이다. */
export function usePredictionFeed() {
  return useInfiniteQuery({
    queryKey: predictionKeys.feed(),
    queryFn: ({ pageParam }) => getPredictionFeed(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
    retry: retryUnlessClientError(),
    throwOnError: false,
  });
}
