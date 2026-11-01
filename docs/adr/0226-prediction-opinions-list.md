# 0226. 예측 탭에 의견 목록과 공감, 신고, 차단을 붙인다 (KAN-697, 웹과 모바일 함께)

## 티켓

KAN-697은 "[FE] 웹 예측 의견 목록과 공감, 신고 연동"이다. 예측 탭 아래 의견 목록
(`GET /matches/{id}/prediction/opinions`)을 적중률순으로 보여 주고 정렬, 픽 필터, 무한 스크롤을 붙이고,
공감(`POST`·`DELETE /predictions/{id}/like`)과 신고(`POST /predictions/{id}/report`)를 연결한다. 완료
조건은 `locked: true`면 잠금 화면, 정렬 셋과 픽 필터에 예측한 사용자는 반대 픽 칩이 먼저, `mine`을 첫
페이지 맨 위에 고정, 기록 배지(`첫 예측`, `n전 m적중`, 5경기 이상은 퍼센트), `isDeleted`면 대체 문구에
픽과 결과 칩 숨김, SETTLED의 적중·빗나감 도장, 공감 응답으로 바로 갱신, 신고 사유 다섯 종과 게스트 연동
안내, 빈 상태 문구다. 참고에 "커서는 불투명 문자열이고 다른 정렬의 커서는 400이다. 정렬이나 필터를 바꾸면
커서를 버린다"가 있다.

KAN-696처럼 티켓은 웹 한 장이지만 시안에 앱과 웹이 둘 다 있어 모바일도 같은 PR에서 함께 했다. 사용자가
"모바일 웹 둘다"라고 했다.

## 어디에 무엇을 두었나

KAN-695가 깔아 둔 바닥 위에 섰다. 읽기 fetcher(`getPredictionOpinions`), 쿼리 키(`predictionKeys.opinions`),
공감 낙관 갱신(`applyOpinionLike`), 오류 분류(`classifyPredictionError`)는 다 있었고 웹 서버 액션에는
공감과 신고가 이미 있었다. 이번에 더한 건 이렇다.

- `@plick/domain/prediction`: 정렬 선택지와 라벨(`PREDICTION_OPINION_SORTS`), 픽 필터 순서
  (`predictionFilterPicks`), 빈 상태 문구(`predictionOpinionsEmptyText`). 정렬 값은 BE 쿼리 파라미터와
  화면 카피가 한 쌍이라 `COMMENT_REPORT_REASONS`처럼 도메인에 뒀다.
- `@plick/core/prediction-sync`: 차단 뒤 캐시에서 그 사용자의 의견과 답글을 빼는 `removeBlockedOpinions`,
  `removeBlockedReplies`. `predictionKeys`에 모든 의견 목록과 모든 답글 목록을 가리키는 상위 키
  (`opinionLists`, `replyLists`)를 더했다.
- 앱마다 `_hooks/usePredictionOpinions`(무한 쿼리), `usePredictionOpinionLike`(공감 토글),
  `useReportPredictionOpinion`(신고)과 `live/_components/PredictionOpinions`(의견 자리 전체),
  `PredictionOpinionRow`(행), 신고 UI(웹 `PredictionReportDialog`, 앱 `PredictionReportSheet`). 앱에는 정렬
  시트 `PredictionSortSheet`가 하나 더 있다. 모바일 `_services/prediction-actions.ts`에 공감과 신고 액션을
  웹에서 복제했다.
- 두 앱의 `useBlockUser`가 댓글 캐시에 더해 예측 의견·답글 캐시도 훑는다.

KAN-696의 `PredictionTab`(앱)과 `PredictionPanel`(웹)이 들고 있던 의견 머리글, 내 예측 상자, 잠금 지면은
새 `PredictionOpinions`로 옮겼다. 잠금 여부가 이제 요약이 아니라 목록 응답에 걸리기 때문이다(아래).

## 잠금은 누가 정하나

KAN-696에서는 요약의 `status === "OPEN" && myPrediction === null`로 잠금 지면을 그렸다. 목록이 없었으니
그게 전부였다. 티켓은 "`locked: true`면 잠금 화면"이라 서버가 정한 값을 보라고 한다. 둘이 어긋나는
순간이 있다. 등록 직후다. 등록 훅은 요약 캐시를 PUT 응답으로 바로 덮고(내 예측이 생긴다) 의견 목록은
무효화해 다시 받는다. 다시 받는 동안 옛 목록 캐시는 `locked: true`다. 서버 값만 보면 내 예측 상자 위에
잠금 지면이 한 프레임 스치고, 요약만 보면 서버가 잠근 사용자에게 빈 목록을 보여 준다.

그래서 셋을 조합했다. 목록 응답이 있으면 그 `locked`, 없으면 요약으로 먼저 판단한다. 그리고 요약은 내
예측이 있는데 목록이 아직 `locked: true`이고 받는 중이면 "받는 중"으로 보고 상자만 그린다. mock에서는 이
조합이 또 하나를 드러냈다. mock은 저장을 안 하니 등록 뒤 다시 받은 목록도 `locked: true`로 온다. 받는
중이 끝나면 조건이 "서버가 잠금"으로 떨어져 상자가 사라지고 잠금 지면이 선다. 실제 BE에서는 저장이 되니
안 일어나지만 mock에서 등록 흐름을 보려면 요약 캐시를 덮는 그 순간만 볼 수 있다.

## 공감은 어디를 덮나

댓글 좋아요(`useCommentLike`)는 목록 캐시가 하나라 그 키 하나를 `setQueryData`로 덮는다. 의견은 정렬 셋과
픽 필터 넷의 곱만큼 캐시가 따로 산다. 적중률순 전체에서 하트를 누르고 최신순으로 바꾸면 같은 의견이
다른 캐시에서 옛 값으로 나온다. 그래서 경기 상위 키(`opinionsOf`)로 `setQueriesData`를 돌려 그 경기의 모든
목록 캐시에서 그 의견을 덮는다. 덮는 함수는 KAN-695가 만든 `applyOpinionLike`다. 손대지 않은 페이지는
같은 참조를 돌려줘 렌더가 안 난다.

`useLikeToggle`은 서버 액션이 `{ ok, likeCount }`를 돌려준다고 가정한다(`ToggleLikeResult`). 예측 액션은
`{ ok, data: { liked, likeCount } }`다. 액션 쪽을 바꾸면 KAN-695의 계약이 흔들리고 `useLikeToggle`을
바꾸면 기사·릴·댓글이 다 걸린다. 훅 안에서 한 줄로 접었다.

## 차단은 빼는가 가리는가

댓글은 차단한 사용자의 글이 목록에서 빠지지 않고 `isBlocked: true`로 온다. 그래서 `useBlockUser`가 캐시의
그 사용자 댓글에 플래그만 세우고 렌더가 안내 문구로 바꾼다. 예측 의견은 BE 계약이 "차단한 사용자의
의견은 빠진다"다. 플래그가 없으니 가릴 자리가 없고, 다음 조회와 같은 모양이 되려면 지금 받아 둔
페이지에서도 행을 지워야 한다. 그래서 `removeBlockedOpinions`가 `author.userId`로 필터한다.

이걸 어디에 둘지 잠깐 망설였다. 의견 행에서 차단 성공 콜백으로 지우면 댓글과 예측이 각자 캐시를 챙기는
꼴이 되고, 기사 댓글에서 차단한 사용자가 예측 탭에 그대로 남는다. 차단은 사용자 단위라 모든 캐시를 한
곳에서 훑는 게 맞다. `useBlockUser`에 두 줄을 더했다. 답글 캐시(KAN-698이 만들 것)도 같이 훑도록
`removeBlockedReplies`까지 미리 뒀다. 답글 타입에 `author.userId`가 이미 있어 비용이 없었다.

## 신고 UI를 왜 복제했나

댓글 신고 팝업(`ReportCommentDialog`)과 모양이 같다. 그대로 쓰고 싶었는데 그 컴포넌트는 안에서
`useReportComment`를 부르고 `needsSocialAccount`로 401·403을 가른다. 예측은 뮤테이션이 다르고 오류
분류가 `classifyPredictionError`라 내 글 400 `PREDICTION_SELF_REPORT`와 중복 409 `REPORT_DUPLICATED`에
가이드 문구("내 글은 신고할 수 없어요", "이미 신고한 글이에요")를 붙인다. 뮤테이션과 분류를 prop으로 빼면
댓글 쪽 호출부 넷을 같이 고쳐야 한다. 이 저장소가 훅과 화면을 앱마다 복제하는 쪽을 택해 온 것과 같은
판단으로 복제했다. 껍데기(사유 다섯 줄, 라디오 표시, 접수 완료 상태)는 같으니 답글 신고(KAN-698)까지
세 번째 사용처가 생기면 그때 공용 껍데기로 뺀다.

## 화면

행은 시안대로 앱과 웹이 조금 다르다. 앱은 첫 줄에 엠블럼, 닉네임, 기록, 시간이고 둘째 줄이 픽 배지와
적중 여부다. 웹은 폭이 넉넉해 첫 줄에 다 둔다. 본문은 세 줄 말줄임이고 하단은 하트와 수, `답글 [n]`,
신고, 차단이다. 빨강은 답글 수와 눌린 하트에만 쓴다(가이드 §6). 답글 글자는 웹이 늘 보이고 앱은 답글이
있을 때만 보인다. 시안이 그랬다.

정렬은 웹이 머리글 줄 오른쪽에 셋을 글자로 나열하고 앱은 글자 버튼 하나가 시트를 연다. 픽 필터는 웹이
`의견` 옆에 인라인, 앱은 머리글 아래 가로 스크롤 줄이다. 순서는 전체, 다른 픽 둘, 내 픽이다. 내 의견은
상자로 따로 서 있어 내 픽 칩은 "나와 같은 쪽"을 볼 때만 쓰니 뒤로 보냈다. 예측 전에는 필터를 숨긴다.

정렬이나 필터를 바꾸면 커서를 버린다는 티켓 참고는 쿼리 키로 풀었다. 키에 정렬과 픽이 들어가 바꾸면
다른 캐시를 보고 `initialPageParam`이 null이라 첫 페이지부터다. 다른 정렬의 커서가 섞일 길이 없다.

행을 눌러 답글로 가는 동선(앱은 의견 상세 화면, 웹은 행 아래 펼침)은 KAN-698이라 행은 버튼이 아니다.
시안은 행 전체가 `role=button`인데 지금 눌러도 갈 곳이 없어 역할을 주지 않았다.

내 예측 상자의 기록(`3전 3적중`)은 KAN-696이 "의견 목록의 `mine`이 붙을 때"로 남겨 둔 것이다. 목록 첫
페이지의 `mine.author.record`를 문자열로 접어 상자에 넘긴다. 목록을 아직 못 받았으면 비워 둔다.

## mock에서 본 것과 못 본 것

KAN-696 때와 같이 BE를 `SPRING_PROFILES_ACTIVE=mock` 8081로 띄우고 두 앱 dev를 `API_BASE_URL`로
붙였다. `.claude/launch.json`의 `backend-mock`은 샌드박스가 `./gradlew` 실행을 막아 Bash 백그라운드로
직접 띄웠다. mock은 어떤 Bearer든 로그인으로 치고 `/users/me`가 소셜로 답하니 게스트 쿠키만 있어도
`mine`이 실린 목록이 온다.

900001(SETTLED)에서 목록을 봤다. 내 예측 상자에 `31전 17적중 55%`가 붙고, 행마다 기록(`25전 19적중 76%`,
`첫 예측`), 픽 배지, 적중·빗나감, `답글 [3]`이 섰다. 삭제 의견(런던은빨강)은 대체 문구만 남았다. 처음에는
웹 행이 삭제 의견에도 픽 배지와 빗나감을 그렸다. mock이 `isDeleted: true`에 `pick`을 함께 주고 있었고
나는 `pick !== null`만 보고 있었다. 계약은 null이라지만 `isDeleted`를 먼저 보게 바꿨다. 픽 필터 순서는 내
픽이 홈(토트넘)이라 무승부, 맨유 승, 토트넘 승이었다. 하트를 누르면 96이 97로 바로 바뀌고 응답 뒤에도
97로 남았다(서버 액션은 페이지 URL로 POST라 네트워크 목록에 `like`가 안 보여 처음엔 요청이 안 나간 줄
알았다). 무승부 필터는 `pick=DRAW`, 최신순은 `sort=latest`로 나갔고 둘을 섞어도 커서 없이 첫 페이지였다.
신고는 사유를 고르면 버튼이 살아나고 접수 뒤 "신고가 접수되었어요"로 바뀌었다. 모바일도 같은 흐름에
정렬 시트가 열려 공감순을 고르면 `sort=likes`로 받았다. 900003(OPEN 미예측)은 서버가 `locked: true`를
줘 두 앱 다 필터와 정렬 없이 잠금 지면과 투표하기 버튼만 섰다.

차단은 mock에 `/users/me/blocks`가 없어 확인 팝업 안에 "대상을 찾을 수 없습니다"가 남는 것까지만
봤다. 실패 문구가 팝업 안에 남고 닫히지 않는 건 맞는 동작이다. 캐시에서 행이 빠지는 건 단위 테스트
(`removeBlockedOpinions`)로만 확인했다. 무한 스크롤도 mock 의견이 다섯 건뿐이라 다음 페이지를 못
봤다. 감시 요소와 `getNextPageParam`은 댓글 목록과 같은 꼴이라 코드로만 맞췄다. 게스트의 신고 연동
안내와 403 `PREDICTION_LOCKED`도 mock이 재현하지 않는다.

웹을 330px로 줄이자 머리글 줄이 한 줄 높이에 묶여 "의견" 두 글자가 세로로 꺾였다. `h-10`을 `min-h-10`과
`flex-wrap`으로 바꿔 필터와 정렬이 둘째 줄로 내려가게 했다. 내 예측 상자 첫 줄도 기록이 붙으면서 "내
예측"과 "적중"이 글자 단위로 꺾여 같은 식으로 풀었다.

## 검증

- `pnpm format:check`, `pnpm lint`, `pnpm check-types`, `pnpm test:hooks`, `pnpm test:unit`(새 테스트 4건
  포함 242건), `pnpm build` 통과
- mock BE 8081 + 두 앱 dev에서 900001 목록, 기록 배지, 삭제 행, 공감 낙관 갱신, 픽 필터와 정렬의 요청
  파라미터, 신고 접수, 900003 잠금 지면을 눈으로 확인. 웹은 1024와 330 폭, 모바일은 375 폭

## 남긴 것

- 행을 눌러 답글로 가는 동선(앱 의견 상세 화면, 웹 행 아래 펼침)은 KAN-698. 그때 행에 `role=button`을
  준다
- 신고 UI 껍데기(사유 다섯 줄, 라디오, 접수 완료)가 댓글과 예측 둘로 복제돼 있다. 답글 신고가 세 번째
  사용처가 되면 공용 껍데기로 뺀다
- 차단 뒤 캐시 정리, 무한 스크롤 다음 페이지, 게스트 신고 연동 안내는 mock이 재현하지 못해 눈으로 못
  봤다. dev에 소셜 토큰이 생기면 실제로 밟아 본다
- 공감의 403 `PREDICTION_LOCKED`는 되돌리기만 하고 문구가 없다. 잠금 지면에서는 하트가 안 보여 실제로는
  닿지 않는 길이다
