# 0232. 승부예측 읽기 훅 여덟 개를 @plick/core로 올린다 (KAN-685 후속, 웹과 모바일 함께)

## 왜 지금 하나

승부예측 에픽(KAN-685)은 KAN-695에서 타입과 fetcher, 쿼리 키, 무효화를 `@plick/domain`과 `@plick/core`에
깔고, KAN-696부터 702까지 화면을 웹과 모바일에 나란히 붙였다. 그 여덟 티켓이 훅을 앱 `_hooks/`에 하나씩
복제해 두었다. 헤드리스 리뷰(`./scripts/review/pr-review.sh`)가 KAN-700, 701, 702에서 세 번 연속 "두 앱의
훅이 바이트 단위로 같다"를 INFO로 짚었고, ADR 0230과 0231은 "에픽이 끝난 뒤 한꺼번에 판단한다"고 미뤄
뒀다. KAN-702를 push한 직후 사용자가 이 판단을 이 세션에서 이어 하자고 했다.

브랜치는 KAN-702 브랜치(`feature/KAN-702-my-predictions`) 위에 땄다. 옮길 훅 가운데 `useMyPredictions`가
그 브랜치에만 있어 develop에서 따면 같은 파일을 두 번 만들게 된다. PR base는 KAN-702가 develop에
들어간 뒤 develop이다.

## 무엇이 같고 무엇이 다른가

두 앱 `_hooks/`의 승부예측 훅 열아홉 개를 `diff`로 대조했다.

| 훅                                                                                                                        | 종류              | 두 앱 차이                              | 앱 전용 의존                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------- | --------------------------------------------------- |
| `usePredictionSummary`, `useKeyPlayers`, `usePredictionHome`                                                              | 읽기(useQuery)    | 없음                                    | `LIVE_MAX_RETRIES`                                  |
| `usePredictionRankings`, `useMyPredictionStats`                                                                           | 읽기              | 없음                                    | `FEED_MAX_RETRIES`                                  |
| `usePredictionOpinions`, `usePredictionReplies`                                                                           | 읽기(무한)        | 주석 한두 줄                            | `FEED_MAX_RETRIES`                                  |
| `useMyPredictions`                                                                                                        | 읽기(무한)        | 주석(게스트 분기 설명)                  | `FEED_FRESH_MS`, `FEED_MAX_RETRIES`, `useFreshSeed` |
| `usePredictionOpinion`                                                                                                    | 읽기              | 모바일에만 있음                         | `FEED_MAX_RETRIES`                                  |
| `usePredictionCompose`, `usePredictionCancel`, `useKeyPlayerVote`, `useUnblockUser`                                       | 쓰기(useMutation) | 없음                                    | `_services/prediction-actions`                      |
| `usePredictionOpinionLike`, `usePredictionReplyLike`                                                                      | 쓰기              | 주석                                    | `useLikeToggle`(`useAuth`)                          |
| `useCreatePredictionReply`, `useUpdatePredictionReply`, `useDeletePredictionReply`, `useReportPrediction`, `useBlockUser` | 쓰기              | 모바일만 `meta: { errorHandled: true }` | `_services/prediction-actions`                      |

읽기 여덟은 코드가 같고 의존이 캐시 정책 상수 셋(두 앱이 같은 값)과 `useFreshSeed`(두 앱 같은 구현)뿐이다.
쓰기 열하나는 앱의 서버 액션에 묶여 있다. 서버 액션 파일(`"use server"`)은 HttpOnly 쿠키에서 토큰을 꺼내
Bearer로 싣는데 쿠키 이름이 앱 상수(`AUTH_COOKIES`)에 박혀 있어 core가 가질 수 없다(KAN-695가 그 이유로
복제를 택했다). 게다가 모바일 쓰기 훅은 `meta: { errorHandled: true }`를 달아 QueryProvider의 전역 토스트
(KAN-447)를 비껴가고 웹은 그 안전망이 없어 달지 않는다. 같은 코드가 아니다.

## ADR 0011 게이트로 판단

- 게이트 A(앱을 역참조하지 않는가). 읽기 훅은 상수 셋과 `useFreshSeed`만 끊으면 된다. 상수는 두 앱이 KAN-321
  부터 "표면 성격 따라 갈릴 수 있는 앱 정책"이라며 복제해 왔는데 한 번도 갈린 적이 없다. core에
  `query-policy.ts`를 두어 값을 올리고 앱 상수 파일은 거기서 다시 내보낸다(re-export). 앱 call site는
  그대로고, 어느 앱이 정말 다른 값을 써야 하면 그 파일에서 자기 값을 선언하면 된다. 그 선택지를 남기는
  게 복제보다 싸다. `useFreshSeed`는 react만 쓰는 순수 훅이라 그대로 올렸다. 쓰기 훅은 서버 액션을 인자로
  주입하면 넘길 수는 있지만 훅이 팩토리가 되고 `meta` 차이까지 인자로 받아야 해서 두 파일보다 읽기
  어렵다. 못 넘긴 것으로 본다.
- 게이트 B(동일한가). 읽기 여덟은 바이트 단위로 같거나 주석만 다르다. 통과.
- 게이트 C(안정적인가). 두 번째 사용처가 이미 있고 에픽이 끝나 모양이 굳었다. 통과. `usePredictionOpinion`
  (의견 상세)은 모바일만 쓰니 C 미달로 앱에 둔다. 웹이 의견 상세 화면을 가지면 그때 올린다.

결론은 읽기 여덟과 `useFreshSeed`, 정책 상수 셋을 올리고 쓰기 열하나는 앱에 둔다.

## core가 React 훅을 가져도 되나

`@plick/core`는 지금까지 fetcher와 키, 순수 캐시 조작(`prediction-sync`, `feed-refresh`)만 들고 있었고
`@tanstack/react-query`는 타입만 썼다. 훅을 두려면 `react`가 필요하다. `@plick/ui`가 이미 `react`를
dependencies에 두고 `"use client"` 컴포넌트를 내보내는 선례라 같은 모양으로 `react`와 `@types/react`를
더했다(`pnpm add --filter @plick/core`). ESLint도 `base`에서 `react-internal`로 바꿔 `react-hooks` 규칙이
돌게 했다.

걱정한 건 react-query 인스턴스가 둘이 되는 일이다. core의 `useQuery`가 앱의 `QueryClientProvider`와 다른
모듈 인스턴스를 보면 "No QueryClient set"으로 죽는다. pnpm은 같은 버전을 저장소 한 곳
(`node_modules/.pnpm/@tanstack+react-query@5.101.4_react@19.2.0`)에 두고 세 패키지가 거기로 심링크되니
하나다. 두 앱과 core가 `^5.101.4`로 같은 범위라 앞으로도 한 곳이다. 버전을 한쪽만 올리면 갈라지니
올릴 때 셋을 같이 올려야 한다.

Next가 패키지의 `.ts` 소스를 그대로 가져오는 건 fetcher 때부터 돌던 길이고, `"use client"` 지시어가 패키지
모듈에 있는 것도 `@plick/ui`의 `LiveCrest`가 이미 그렇다. 빌드가 통과했다.

## 어디에 무엇을 두었나

- `packages/core/src/query-policy.ts`: `FEED_FRESH_MS`(30분, `staleTime`과 `gcTime`을 같은 값으로 두는 이유
  주석을 그대로 옮겼다), `FEED_MAX_RETRIES`(2), `LIVE_MAX_RETRIES`(1), 그리고 4xx는 재시도하지 않는
  `retry` 함수 `retryUnlessClientError(max)`. 무한 쿼리 훅마다 같은 클로저를 적던 것이다. 테스트
  `tests/unit/query-policy.test.mjs` 3건.
- `packages/core/src/useFreshSeed.ts`: 모바일 것을 그대로.
- `packages/core/src/prediction-queries.ts`: 읽기 훅 여덟. 파일 머리에 "쓰기 훅은 왜 여기 없나"를 적어
  다음 사람이 또 옮기려다 막히지 않게 했다.
- 두 앱 `_hooks/`에서 열여덟 파일을 지우고(`git rm`) 호출부 스물두 곳의 import를
  `@plick/core/prediction-queries`와 `@plick/core/useFreshSeed`로 바꿨다. 활동 훅 셋(`useMyComments`,
  `useLikedArticles`, 모바일 `useMyActivityCounts`)도 `useFreshSeed`를 core에서 받는다.
- 두 앱 `_constants/feed.ts`는 상수 둘을 core에서 다시 내보내는 두 줄이 됐고, `_constants/live.ts`는
  `LIVE_MAX_RETRIES`만 그렇게 바꿨다. 나머지 라이브 상수는 그대로다.

`retryUnlessClientError`를 다른 무한 쿼리 훅(기사 피드, 댓글, 릴스 등 스물다섯 파일)에도 적용할 수 있지만
이번에는 옮긴 훅에만 썼다. 승부예측 승격 PR에 피드 훅 스물다섯을 섞으면 리뷰 범위가 흐려진다.

## 검증

`pnpm lint`(core는 react-internal 규칙으로), `check-types`, `test:unit`(274건), `format:check`,
`test:hooks`, `build`를 돌렸다. 다른 세션의 dev-mock 서버(web 3030, mobile 3031)가 브랜치를 그대로 서빙해
브라우저 패널로 네 화면을 봤다. 모바일 402x874에서 MY 예측 탭(기록 상자 `58% / 7/12 / 128위 / 14`, 행 넷),
경기 900001 예측 탭(상태 줄, 바, 의견 다섯), 투표 랭킹 탭(여섯 명과 내 순위 128), 홈 승부예측(카드 둘,
`128위`)이 전과 같았고 네트워크에 `/be/api/v1/me/predictions`, `predictions/rankings`, `predictions/home`,
`me/prediction-stats`, `matches/900001/prediction/opinions`가 전과 같이 나갔다. 웹 1024에서도 같은 네 화면이
같았다. 패널이 숨어 있으면 첫 `get_page_text`가 하이드레이션 전 HTML(`-` 네 칸, 빈 목록)을 돌려줘 스크린샷을
한 번 찍어 깨우고 다시 읽었다(알려진 함정).
