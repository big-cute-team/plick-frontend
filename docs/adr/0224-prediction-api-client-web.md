# 0224. 웹 승부예측 API 클라이언트와 타입을 만든다 (KAN-695)

## 티켓

승부예측은 에픽 KAN-685다. BE 9장(KAN-686~694)이 먼저 끝나 dev에 배포돼 있고, 프론트는 KAN-695부터
KAN-702까지 여덟 장이다. 이번 티켓은 그 첫 장으로, 화면이 아니라 화면들이 함께 쓸 바닥이다. 예측 API
21개 호출 함수와 도메인 타입, 쿼리 키, 오류 코드별 화면 처리 기준을 만든다. 완료 조건에 "게스트 403은
로그인 시트가 아니라 계정 연동 안내로 분기", "401은 로그인 시트로", "`PREDICTION_CLOSED` 같은 다섯 code
공통 처리", "dev API로 검증"이 있다.

같이 받은 건 디자인 시안 폴더였다. 앱 v2와 홈 v2 시안 HTML, 그리고 `승부예측 프론트엔드 가이드.md`.
가이드에 상태별 표시 규칙과 컴포넌트 치수, 카피, API 연결표(어느 화면이 어느 호출을 어느 쿼리 키로
부르고 언제 다시 받는지)가 있어서 이번 작업의 계약은 사실상 이 가이드와 BE 저장소의
`docs/specs/prediction-api.md` 둘이었다. 시안 자체는 KAN-696 이후의 몫이라 이번에는 열어 보기만 했다.

## 어디에 무엇을 두었나

티켓 본문은 `packages/core`라고 적혀 있었다. 이 저장소에는 `@plick/core`가 이미 있고 토론, 라이브 스코어,
댓글의 fetcher와 쿼리 키가 거기 산다. 승부예측도 같은 자리다. 정리하면 네 층이다.

- `@plick/domain/prediction`: 화면이 보는 타입과 순수 헬퍼. 상태(UPCOMING, OPEN, LOCKED, SETTLED, VOID),
  픽(HOME, DRAW, AWAY), 결과(PENDING, HIT, MISS, VOID), 요약, 의견, 답글, 키플레이어, 홈 카드, 랭킹, 내 기록.
  그리고 기록 표기(`첫 예측`, `3전 3적중`, `24전 17적중 71%`), 참여 수와 퍼센트의 물음표 표기, 글자 수 세기,
  임시 저장 키 같은 작은 함수들.
- `@plick/core/predictions`: 읽기 fetcher 9종과 BE 응답 타입, 경계 변환. `predictionKeys`는 쿼리 키,
  `prediction-sync`는 쓰기 뒤 무효화 범위와 공감 낙관 갱신, `prediction-errors`는 오류 분류.
- `apps/web/app/_services/prediction-actions.ts`: 쓰기 12종 서버 액션.
- `@plick/domain/live`와 `@plick/core/live`: 기존 경기 상세 응답의 `preview`에 BE가 더한 팀 최근 전적과
  맞대결 요약을 받는 필드.

왜 읽기와 쓰기를 가르는지는 댓글 때 정한 그대로다. 읽기는 서버 컴포넌트와 클라 훅이 함께 부르니 평범한
모듈이어야 하고, 쓰기는 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 브라우저 JS는 그 쿠키를 못
읽으니 서버 액션을 거친다. 사실 브라우저에서 `/be` 프록시로 보내면 `proxy.ts`가 토큰을 실어 주기는 한다.
그래도 댓글, 토론, 좋아요, 신고, 차단이 전부 서버 액션이라 예측만 다른 길을 내면 훅을 복제할 때마다 두
방식을 알아야 한다. 같은 모양으로 갔다.

서버 액션은 실패를 던지지 않고 값으로 돌려준다. 서버 액션이 던진 에러는 프로덕션에서 메시지가 가려져
클라가 BE code로 분기할 수 없기 때문이다. 12개가 다 같은 꼴이라 `callProtected` 하나에 경로, 메서드, body,
응답 변환 함수, 네트워크 실패 문구를 넘기는 식으로 접었다. 쿠키 읽기와 `ApiError` 분기는 거기 한 번만 있다.

## 타입을 어떻게 접었나

BE 응답 모양을 화면까지 흘리지 않는다는 규칙은 그대로 지켰다. `predictionId`는 `id`, `likedByMe`는
`liked`, 작성자의 `favoriteTeamId`는 `favoriteTeam: TeamCode | null`로 접는다. 의견 행이 닉네임 뒤에 마이팀
엠블럼을 그리는데, 화면이 팀 id를 코드로 바꾸는 일을 하게 두면 `TEAM_CODES`를 아는 컴포넌트가 늘어난다.
경계에서 끝낸다.

홈 카드와 내 기록의 팀은 라이브 스코어의 `LiveTeam`을 그대로 쓰기로 했다. 처음엔 `PredictionTeam`을 새로
만들려 했는데 홈 카드 응답에 브라이턴, 크리스탈 팰리스처럼 빅6 밖 팀이 `teamId: null`로 섞여 오고, 이건
라이브 카드가 벌써 푼 문제다. 코드(빅6면 크레스트), 3글자 약어, 전체 이름을 함께 든 모양이 필요한데 그게
`LiveTeam`이다. 내 기록 응답은 `teamId` 없이 소문자 코드만 주길래, `toPredictionTeam`이 id가 있으면 id로,
없으면 코드를 대문자로 올려 빅6인지 본다. 로고 URL은 이 응답들에 없어 null이고 빅6는 `TeamCrest`가 로컬
크레스트를 쓰니 상관없다.

키플레이어 평점은 BE가 `"7.45"` 문자열로 준다. 라이브의 `parseRating`을 그대로 빌려 숫자로 접었다. 의견
목록의 `locked: true`는 에러가 아니라 화면 상태다. 200으로 오고 `items`가 빈 페이지라 그대로 돌려주고,
화면이 가짜 행에 블러를 거는 건 KAN-697 몫이다.

예측 요약과 키플레이어의 404 `PREDICTION_NOT_AVAILABLE`은 던지지 않고 null로 돌려준다. 빅6 밖 경기나
일정에 없는 경기가 그렇게 오고, 경기 상세가 "예측 탭을 만들 경기인가"를 이 호출로 판별하니 토론의
`getArticleDebate`와 같은 판단이다.

## 오류 분류

티켓의 완료 조건 셋이 전부 오류 처리라 이걸 한 파일로 모았다. `classifyPredictionError`는 `ApiError`를
받아 종류(`login`, `link-account`, `closed`, `not-open`, `locked`, `not-available`, `not-found`,
`blocked-word`, `length`, `invalid-pick`, `duplicate-report`, `self-report`, `forbidden`, `not-in-squad`,
`busy`, `network`, `unknown`)와 화면 문구를 돌려준다. 파일 머리에 code, 종류, 화면이 할 일을 표로 박았다.

가장 신경 쓴 건 401과 게스트 403을 가르는 것이다. 댓글은 `needsSocialAccount`가 둘을 묶어 같은 팝업을
띄우고 팝업이 `isGuest`로 문구를 고른다. 예측은 다르다. 게스트가 작성을 누르면 로그인 시트가 아니라
"계정 연동 후 예측할 수 있어요"와 연동하기 버튼이 떠야 한다. 그래서 `needsSocialAccount`로 걸러낸 뒤
code가 `AUTH_GUEST_FORBIDDEN`이면 `link-account`, 아니면 `login`으로 쪼갰다.

문구는 가이드 §7 카피가 있는 종류만 덮고 없으면 BE 문구를 그대로 쓴다. 마감은 "방금 마감됐어요", 금칙어는
"부적절한 표현이 있어요"다. 길이 오류는 가이드에 문구가 없어 BE의 "의견은 5자 이상 300자 이하로 적어
주세요."가 그대로 나간다. 여기에 두 판정 함수를 붙였다. `refetchesSummaryAfter`는 마감과 미개장 뒤 요약을
다시 받으라는 것이고(가이드 "409면 토스트 후 요약 재조회"), `keepsComposerOpen`은 금칙어와 길이처럼 고쳐서
다시 보낼 수 있는 실패는 작성 시트를 닫지 말라는 것이다.

## 쿼리 키와 무효화

가이드 §8의 표를 `predictionKeys`로 옮겼다. 키는 `["predictions", 스코프, 파라미터]` 계층이다. 의견 목록은
정렬과 픽 필터마다 캐시가 따로라 `opinions(matchId, sort, pick)` 밑에 `opinionsOf(matchId)` 접두어 키를 두어
한 경기 의견을 통째로 무효화한다. 내 기록 둘(`myStats`, `myList`)도 `mine()` 밑에 둔다.

쓰기 뒤에 무엇을 다시 받을지는 `prediction-sync.ts`가 든다. 예측 등록, 수정, 취소 뒤에는 요약, 그 경기
의견 전체, 홈 카드, 내 기록이다. 등록 응답이 요약과 같은 모양이라 `setQueryData`로 바로 덮을 수도 있지만,
의견 목록은 잠금이 풀리며 통째로 바뀌고 홈 카드와 내 기록은 다른 경기까지 섞여 있어 무효화가 맞다. 랭킹은
정산 때만 바뀌니 건드리지 않는다. 답글 쓰기 뒤에는 답글 목록과, `replyCount`를 들고 있는 의견 하나와 의견
목록을 받는다. 공감은 낙관 갱신이라 `applyOpinionLike`, `applyReplyLike`가 무한 쿼리 페이지에서 그 항목만
덮고 손대지 않은 페이지는 같은 참조를 돌려준다. 훅은 앱마다 복제되는데 무효화 범위가 앱마다 갈리면 한쪽
화면만 옛 값을 보게 되니 범위는 core가 든다.

## 서버 fetch 캐시

`apiFetch`는 토큰 없는 GET을 60초 데이터 캐시에 넣는다(KAN-380). 예측은 종류마다 신선도가 달라 호출마다
정했다. 의견 목록과 의견 하나, 답글, 내 기록은 BE가 캐시하지 않는 값이라 `cache: "no-store"`, 분포가 실리는
요약과 홈 카드, 키플레이어는 BE 분포 캐시와 같은 30초, 랭킹은 BE 캐시와 같은 10분이다. 토큰을 실은 호출은
`apiFetch`가 `no-store`로 돌리는데 거기에 `next: { revalidate }`를 또 넘기면 Next가 충돌로 보고 둘 다
무시한다. `readInit`이 토큰이 있으면 헤더만, 없으면 캐시 옵션만 만들게 해서 겹치지 않게 했다.

## 프리뷰 확장

BE KAN-690이 경기 상세 `preview`에 `teamForm`(팀별 최근 5경기, 승률, 평균 득실)과 `headToHeadSummary`를
더했다. 도메인 `MatchPreview`에 `teamForms: TeamForm[]`과 `headToHeadSummary: HeadToHeadSummary | null`을
붙이고 `toMatchDetail`이 side 배열을 홈 먼저로 정렬해 `LiveTeam`과 묶는다. 응답 타입 쪽은 optional로 두었다.
prod BE가 아직 옛 버전이어도 빈 배열과 null로 접혀 화면이 안 깨지게. 프리뷰 객체를 만드는 곳이 이 변환
하나뿐이라 다른 데는 손댈 게 없었다.

## 검증

읽기 9종은 dev BE에 직접 붙였다. 단위 테스트 러너가 쓰는 `register.mjs`로 `.ts`를 바로 불러
`API_BASE_URL=https://dev.plick.co.kr/be`를 주면 core 함수가 Node에서 그대로 돈다. 홈 카드 8장(첼시 대
맨유부터 챔피언스리그 경기까지, 빅6 밖 팀은 코드 null에 약어 BHA), 요약은 OPEN에 `revealed: false`, 의견은
`locked: true`, 키플레이어는 후보 30명에 평점 7.6, 프리뷰 `teamForms`에 첼시 `[L, L, W, W, L]` 승률 40과
맞대결 요약 `2승 1무 2패`. 없는 경기 둘은 null, `/me/*` 둘은 401이 `login`으로, 없는 의견은 404가
`not-found`로 분류됐다. 랭킹은 dev에 정산된 경기가 없어 빈 배열이다.

쓰기 12종은 dev에 소셜 토큰이 없어 못 때린다. 티켓이 적어 둔 mock 프로필 경기 id가 그 자리다. BE를
`SPRING_PROFILES_ACTIVE=mock`으로 8081에 띄우면 DB 없이 900001(SETTLED), 900002(LOCKED), 900003(OPEN
미예측), 900004(OPEN 예측함), 900007(VOID), 900008(UPCOMING)이 고정 더미로 산다. 아무 Bearer나 로그인으로
친다. 서버 액션은 Next 밖에서 못 부르니 액션이 보내는 것과 같은 경로, 메서드, body를 `apiFetch`로 직접
보내는 스크립트를 짜서 21개 호출을 42개 검사로 돌렸다. 등록 성공과 UPCOMING 409, 마감 409, 짧은 의견 400,
잘못된 픽 400, 토큰 없음 401, 취소 204, 공감과 취소의 카운트 변화, 남의 답글 수정 403, 후보 밖 선수 400까지
전부 통과했다.

## 204에서 막힌 것

mock에서 처음 돌렸을 때 예측 취소에서 `Unexpected end of JSON input`으로 죽었다. `apiFetch`가 성공 응답을
무조건 `res.json()`으로 읽는데 예측 취소와 답글 삭제는 204라 본문이 없다. 지금까지의 삭제 API(댓글 삭제,
차단 해제)는 전부 200에 `data: null` 봉투를 줘서 이 길을 탄 적이 없었다. 봉투가 있는 줄 알고 벗기다 빈
본문에서 던진 것이다. 그대로 두면 성공한 취소가 네트워크 실패로 보여 화면이 "취소하지 못했어요"를 띄운다.

`res.text()`로 먼저 읽고 비었으면 null을 돌려주게 고쳤다. 상태 코드 204만 보는 대신 본문 길이를 본 건,
200에 빈 본문이 오는 경우까지 같은 길로 받기 위해서다. 공용 클라이언트라 회귀 테스트를 붙였다. `fetch`를
stub해 204, 봉투 있는 200, 실패 봉투 409를 각각 넣는다. 실제 BE에 안 붙고도 `apiFetch`를 테스트할 수 있다는
걸 이번에 처음 해 봤다.

## 남긴 것

- 화면은 하나도 없다. KAN-696(예측 탭과 작성), 697(의견 목록과 공감, 신고), 698(답글), 699(프리뷰),
  700(홈), 701(랭킹), 702(MY)가 이 바닥 위에 선다. 각 티켓이 훅을 만들 때 `prediction-sync`의 무효화 범위와
  `classifyPredictionError`의 종류 표를 그대로 쓰면 된다.
- 모바일 티켓은 아직 없다. 타입과 core는 공용이라 그대로 쓰고 서버 액션만 복제하면 된다.
- 랭킹의 dev 검증은 빈 배열까지였다. 정산된 경기가 생기면 행 모양을 한 번 더 본다.
- 가이드 §10이 말한 "유저가 글을 쓰는 기능은 없다"는 문장은 이 저장소 CLAUDE.md에는 없었다. BE 쪽 문서 얘기로
  보여 손대지 않았다.
