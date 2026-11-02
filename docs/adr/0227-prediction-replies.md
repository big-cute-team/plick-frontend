# 0227. 의견 상세와 답글을 붙인다 (KAN-698, 웹과 모바일 함께)

## 티켓

KAN-698은 "[FE] 웹 의견 상세와 답글 연동"이다. 의견 하나를 펼쳐 보고 답글로 논쟁할 수 있게 한다.
`GET /predictions/{id}`, `GET`·`POST /predictions/{id}/replies`, `PATCH`·`DELETE /prediction-replies/{id}`,
`POST`·`DELETE .../like`, `POST .../report`를 연결한다. 완료 조건은 답글 오래된 순과 작성자 픽 칩
(`authorPick`, null이면 없음), 답장은 입력창에 `@닉네임` 삽입에 1단계만, 본문 1자 이상 300자 이하와 금칙어
400 `PREDICTION_REPLY_BLOCKED` 안내, `isMine`이면 수정·삭제 아니면 신고·차단, 입력창 안내 문구는 내 픽과 원
의견 픽이 같은지로 분기, 잠긴 의견을 직접 열면 403 `PREDICTION_LOCKED`와 없는 의견 404 처리, 작성 201과
삭제 204 처리다. 참고에 "답글 작성과 수정, 삭제, 신고는 소셜 계정만, 공감은 게스트도 된다"가 있다.

KAN-696, 697과 같이 티켓은 웹 한 장인데 시안이 앱과 웹을 다 갖고 있어 모바일도 같은 PR에서 했다. 사용자가
"웹 모바일 둘다"라고 했다. 시안 가이드 §5.6이 둘의 동선을 갈라 둔다. 앱은 의견을 누르면 별도 화면이고
하단에 입력창이 붙는다. 웹은 의견 행을 누르면 그 아래로 펼친다.

## 어디에 무엇을 두었나

KAN-695가 답글 타입(`PredictionReply`), 읽기 fetcher(`getPredictionOpinion`, `getPredictionReplies`), 쿼리 키
(`opinion`, `replies`, `replyLists`), 무효화 범위(`invalidateAfterReplyWrite`), 공감 덮기(`applyReplyLike`),
차단 뒤 빼기(`removeBlockedReplies`), 웹 서버 액션 다섯을 이미 깔아 뒀다. 이번에 더한 건 이렇다.

- `@plick/domain/prediction`: 답글 길이 판정(`isPredictionReplyLengthValid`, 1자 이상), 답장 머리말
  (`predictionReplyMention`), 입력창 안내 분기(`predictionReplyPlaceholder`), 신고 대상 타입
  (`PredictionReportTarget`). 단위 테스트를 붙였다.
- `@plick/core/prediction-sync`: 수정 응답으로 그 답글만 덮는 `applyReplyUpdate`, 삭제 뒤 그 답글만 빼는
  `removeReply`. 테스트에 같은 참조 유지까지 본다.
- 모바일 `_services/prediction-actions.ts`에 답글 다섯 액션(공감, 신고, 등록, 수정, 삭제)을 웹에서 복제했다.
  이제 모바일에 남은 건 키플레이어 투표(KAN-699)뿐이다.
- 앱마다 훅 여섯. `usePredictionReplies`(무한 쿼리), `usePredictionReplyLike`, `useCreatePredictionReply`,
  `useUpdatePredictionReply`, `useDeletePredictionReply`, 그리고 `useReportPredictionOpinion`을
  `useReportPrediction`으로 바꿔 대상 종류로 액션을 가르게 했다. 모바일에는 `usePredictionOpinion`(의견 하나)이
  하나 더 있다.
- 모바일 화면: `live/predictions/[predictionId]/page.tsx` 라우트와 `PredictionOpinionScreen`(상세 본체),
  `PredictionReplyRow`, `PredictionReplyComposer`(하단 입력바). 의견 행의 공감·신고·차단 버튼은
  `PredictionOpinionActions.tsx`로 빼서 행과 상세가 같이 쓴다.
- 웹 화면: `PredictionReplies`(행 아래 펼침 영역), `PredictionReplyRow`, `PredictionReplyComposer`,
  `PredictionOpinionActions.tsx`. 의견 행은 `role=button`이 되고 `expanded`·`onToggle`을 받는다.

## 모바일 상세 화면은 세 가지를 받는다

앱 의견 상세 화면의 주소는 `/live/predictions/{id}`다. 원 의견 전문은 `GET /predictions/{id}`가 주는데 거기에
팀명이 없다. 픽 배지 `맨시티 승`과 상단바 제목 `맨유 vs 맨시티`를 그리려면 경기 상세의 팀명이 필요하다. 응답에는
`matchId`가 실려 오니 그걸로 경기 상세를 또 받으면 되는데, 그러면 팀명이 원 의견보다 한 박자 늦게 온다. 그리고
403 잠금처럼 원 의견을 아예 못 받으면 경기 id도 없어서 "의견 남기기" 버튼이 어디로 가야 할지 모른다.

그래서 의견 행이 상세로 보낼 때 경기 id를 쿼리로 같이 보낸다(`?match=900001`). 상세 화면은 쿼리의 경기 id로 경기
상세와 예측 요약을 바로 받기 시작하고, 원 의견이 오면 그 `matchId`를 우선한다. 예측 탭에서 들어온 경우 경기
상세와 요약은 이미 캐시에 있어 요청이 안 나간다(라이브 폴링 주기만큼 신선하면 된다고 봤다). 딥링크로 쿼리 없이
열면 원 의견이 준 경기 id로 뒤늦게 받는다. 제목은 그동안 "의견"이다.

예측 요약을 받는 이유는 내 픽이다. 티켓이 "입력창 안내 문구는 내 픽과 원 의견 픽이 같은지로 분기"라 했는데 내
픽은 요약의 `myPrediction`에만 있다. 시안 두 파일을 뒤져도 분기한 문구는 없고 `답글 입력` 하나뿐이라 문구를
정했다. 같은 픽이면 `같은 픽에 의견 보태기`, 다른 픽이면 `다른 픽에 반론 남기기`, 예측하지 않았거나 원 의견이
지워져 픽이 없으면 `답글 입력`이다. 설명체 금지 규칙에 걸릴 수 있어 도메인 함수 주석에 예외라고 적어 뒀다.
기획이 다른 말을 주면 함수 하나만 고치면 된다.

답글 목록은 원 의견을 받은 뒤 켠다. 원 의견이 403이면 답글도 403이라 두 번 실패할 이유가 없다.

## 모바일에서 404가 에러 화면으로 떨어졌다

처음 404 경로를 밟았더니 "문제가 생겼어요" 루트 에러 화면이 떴다. 화면에는 `isError`를 보고 안내 문구를 그리는
분기가 있었는데 거기까지 안 왔다. 모바일 `QueryProvider`가 KAN-447에서 `throwOnError`를 "보여줄 데이터가 없는
실패는 가장 가까운 에러바운더리로 던진다"로 깔아 뒀기 때문이다. 첫 조회 실패는 데이터가 없으니 훅이 값을
돌려주기 전에 던졌다. 웹은 그 기본값이 없어 같은 코드가 멀쩡했다.

KAN-696의 `usePredictionSummary`가 `throwOnError: false`를 박아 둔 이유를 그때 알았다. 의견 하나, 답글 목록,
상세 화면의 경기 상세 쿼리에 같은 줄을 넣었다. 403 잠금과 404는 화면이 문구로 받는 실패지 경계로 보낼 실패가
아니다. 웹 `usePredictionReplies`에도 같은 줄을 둬서 두 앱의 훅을 같은 모양으로 유지했다.

## 웹 행 펼침과 이벤트 전파

웹은 의견 행을 누르면 아래로 펼친다. 행 안에 하트, 신고, 차단 버튼이 있어 행을 `<button>`으로 감쌀 수 없다
(버튼 안의 버튼은 유효하지 않은 HTML이다). `role=button`에 `tabIndex=0`, Enter와 Space 처리를 손으로 달았다.
KAN-697 ADR이 "행에 `role=button`을 준다"고 남겨 둔 그 자리다.

문제는 전파다. 행 안의 하트를 누르면 클릭이 행까지 올라가 펼쳐지거나 접힌다. 액션 줄과 펼친 영역을
`stopPropagation`하는 div로 감쌌다. 여기서 하나 더 챙길 게 포털이다. 신고 팝업과 차단 확인은 `createPortal`로
body에 그리는데, React 합성 이벤트는 DOM 트리가 아니라 React 트리를 따라 올라간다. 팝업 안에서 사유를 고르는
클릭이 DOM상으로는 body 직계인데 React상으로는 액션 줄 안의 `PredictionMoreActions` 자식이라 행까지 올라온다.
액션 줄의 가드가 그 클릭도 막아 준다. 실제로 펼친 채 신고 팝업을 열고 닫아도 `aria-expanded`가 true로 남았다.

펼친 의견 id는 `PredictionOpinions`가 하나만 든다. 시안의 웹이 `opOpen` 하나로 한 번에 하나만 펼치는 모양이라
그대로 했다. 답글을 등록하면 `invalidateAfterReplyWrite`가 의견 목록도 다시 받는데(`replyCount` 때문) 목록이 새
배열로 와도 펼친 id는 그대로라 펼침이 유지됐다.

## 등록은 다시 받고 수정은 덮고 삭제는 빼고 받는다

댓글 등록(`useCreateComment`)은 201 응답을 캐시 끝에 끼워 넣는다. 답글도 그럴 수 있었는데 다시 받기로 했다.
답글은 오래된 순이라 끼울 자리가 마지막 페이지 끝인데 아직 안 받은 다음 페이지가 있으면 그 자리가 틀리고,
`replyCount`를 든 의견 캐시(정렬·필터별 목록 여러 개와 의견 하나)도 같이 맞춰야 한다. 한 페이지 50건이라
다시 받는 비용이 작다. core의 `invalidateAfterReplyWrite`가 답글 목록, 의견 하나, 그 경기 의견 목록 전체를
무효화한다.

수정은 PATCH가 답글 한 건을 같은 모양으로 돌려주고 `replyCount`는 안 변하니 캐시의 그 답글만 응답으로 덮는다
(`applyReplyUpdate`). 네트워크 목록에 서버 액션 POST 하나만 찍히고 재조회가 없는 걸 확인했다.

삭제는 204라 덮을 값이 없다. 댓글은 지운 자리를 tombstone으로 남기지만 답글은 BE 목록에서 사라진다. 캐시에서
바로 빼고(`removeReply`) 그 다음 `replyCount` 때문에 무효화를 돌린다. 답글 목록도 같이 무효화되지만 이미 뺀
뒤라 깜빡임이 없다. mock은 저장을 안 해서 다시 받은 목록에 그 답글이 돌아왔다. 뺀 순간은 못 봤고 단위 테스트로만
봤다.

## 신고 시트를 두 대상이 같이 쓴다

KAN-697 ADR이 "답글 신고가 세 번째 사용처가 되면 공용 껍데기로 뺀다"고 했다. 막상 보니 댓글 신고까지 셋을 한
껍데기로 묶는 것보다, 예측 신고 시트가 의견과 답글 둘을 받게 하는 쪽이 작았다. 사유 enum과 실패 규약이 같고
경로만 다르다. `PredictionReportTarget`({ kind: "opinion" | "reply", id })을 받아 제목(`의견 신고`, `답글 신고`)과
액션만 가른다. 훅도 `useReportPrediction` 하나로 합쳤다. 댓글 신고 팝업은 그대로 둔다. 거기는 훅과 401 판정이
안에 박혀 있어 합치면 호출부 넷을 같이 손봐야 한다.

같은 이유로 의견 행의 신고·차단 버튼(`OpinionMoreActions`)을 `PredictionMoreActions(target, author)`로 바꿔
답글 행도 쓴다. 차단은 사용자 단위라 `author.userId`만 있으면 되고 캐시 정리는 `useBlockUser`가 의견과 답글
캐시를 다 훑는다(KAN-697이 미리 둔 `removeBlockedReplies`가 이번에 처음 실제로 쓰인다).

## mock에서 본 것과 못 본 것

다른 세션이 같은 작업 트리에 `web-dev-mock`(3030)과 `mobile-dev-mock`(3031)을 띄워 둔 상태였다. Next 16은
디렉터리당 dev 하나라 내 세션에서 새로 못 띄웠는데, 같은 트리라 그 서버가 내 브랜치 코드를 HMR로 그대로
서빙했다. 브라우저 패널로 그 주소에 붙어 검증했다. mock BE는 8081에 이미 떠 있었다.

모바일은 900001(SETTLED) 예측 탭에서 축구는과학 행을 눌러 `/live/predictions/1002?match=900001`로 갔다. 제목
`Tottenham vs Manchester United`, 원 의견 전문(말줄임 없음)과 픽 배지·적중, `답글 [3]`, 답글 셋에 작성자 픽
배지(`첫예측러`는 픽이 없어 배지 없음), 내 답글(`플릭유저`)만 수정·삭제가 섰다. 입력창 안내는 내 픽과 원 의견 픽이
둘 다 홈이라 `같은 픽에 의견 보태기`였다. 답장을 누르면 입력값이 `@올드트래포드 `이 되고 포커스가 갔다. 글을 쓰고
Enter를 치면 서버 액션 POST 뒤 답글과 의견이 다시 왔고 입력이 비었다. 수정은 인라인 폼에 저장하면 본문이 바뀌고
`, 수정됨`이 붙었다. 삭제는 확인 시트 뒤 POST와 재조회가 돌았다. 답글 하트는 0이 1로 바로 바뀌었다. 404는
`/live/predictions/1101?match=900003`으로 `지워졌거나 볼 수 없는 의견이에요`와 쿼리의 경기 제목이 섰다.

웹은 같은 경기에서 행을 눌러 펼쳤고 `GET .../1002/replies?size=50`이 그때 처음 나갔다. 답장, 등록(POST 뒤
답글과 의견 목록 재조회, 펼침 유지), 하트(96이 97, 펼침 유지), 수정 저장, 접기까지 봤다. 신고 팝업은 답글에서
열면 제목이 `답글 신고`, 설명이 `올드트래포드님의 답글을 신고합니다`였다. 330px로 줄여 펼쳐도 가로 넘침이 없었다
(`scrollWidth` 330).

못 본 것. mock은 쓰기를 저장하지 않아 등록한 답글이 목록에 붙는 모습과 삭제된 행이 빠진 채 남는 모습은 못 봤다.
403 `PREDICTION_LOCKED`는 mock이 OPEN 경기(900003)의 의견도 200으로 줘서 재현이 안 됐고, 잠금 지면 코드는
`classifyPredictionError`의 `locked` 분기로만 맞췄다. 금칙어 400과 게스트 403 연동 안내도 mock이 안 준다.
다음 페이지(커서)도 답글이 셋뿐이라 못 봤다. 차단은 mock에 `/users/me/blocks`가 없어 실패 문구까지만이다.

## 검증

- `pnpm format:check`, `pnpm lint`, `pnpm check-types`(두 앱 tsc), `pnpm test:hooks`, `pnpm test:unit`(새 테스트
  3건 포함 245건), `pnpm build` 통과. 모바일 빌드에 `/live/predictions/[predictionId]`가 ƒ로 섰다(`searchParams`를
  읽어 동적이고, 유저별 지면이라 noindex)
- mock BE 8081 + 두 앱 dev-mock에서 위 흐름을 눈으로 확인. 모바일 375, 웹 800과 330 폭
- 헤드리스 리뷰(`scripts/review/pr-review.sh`)는 CRITICAL 없이 WARN 둘이었다. 경기 상세를 못 받으면 의견
  상세가 빈 화면으로 남는 것(팀명 없이 `홈 승`, `원정 승`으로라도 그리게 고쳤다)과 id 파서가 0과 안전 정수
  밖을 통과시키는 것(정규식과 `Number.isSafeInteger`로 막았다). "멘션만 있는 답글이 등록된다"는 INFO는 BE가
  받는 값이라 두었다

## 남긴 것

- 입력창 안내 문구 셋은 시안에 없어 내가 정했다. 기획 확인이 필요하다
- 등록 뒤 목록 끝으로 내리는 `scrollToEnd`는 mock에서 새 답글이 안 붙어 실제로 내려가는지 못 봤다
- 403 잠금, 금칙어 400, 게스트 연동 안내, 커서 다음 페이지는 dev BE에 소셜 토큰이 생기면 밟아 본다
- 가이드 §3 "홈 카드, 투표 탭 경기 행, MY 기록 행에서 들어오면 예측 탭으로 바로 연다"는 아직 없다. 지금 의견
  상세의 잠금 지면 버튼도 경기 상세 첫 탭으로 간다. 탭 쿼리 파라미터는 홈 카드 티켓에서 같이 붙인다
