# 0112. 릴스 마감 토론 우회 제거 — BE가 인라인으로 주기 시작했다

## 배경

토론(투표) 기능을 처음 붙일 때(ADR 0109) 릴스 피드에는 마감(FINISH) 게시물의 `debate`가
null로 내려왔다. 릴스 카드에 토론을 인라인으로 실어 주는 BE 로직이 열린(DEBATE) 게시물만
골랐기 때문이다. 그래서 마감 릴에서 결과를 보여주려고 우회를 하나 넣어 뒀다 — 릴 세부
시트(모바일)와 패널(웹)이 열릴 때 `contentType === "FINISH"`면 `useArticleDebate` 훅으로
기사 단건 토론(`GET /api/v1/articles/{id}/debate`)을 따로 받아 표시 전용 카드를 그리는
방식이었다. 당시에도 "BE가 인라인으로 주면 없앨 코드"라고 생각하며 넣었다.

이번에 백엔드가 업데이트됐다는 말을 듣고, 그 우회를 걷어내는 세션이다.

## BE에서 실제로 뭐가 바뀌었나

말만 듣고 고치면 안 되니까 be-verify 서브에이전트에게 로컬 BE를 최신으로 받아 실측부터
시켰다. 확인된 것들:

- 커밋 `f39e308`(KAN-420, 2026-08-27)에서 `ArticleFeedService.safeReelsDebates`의 필터가
  `contentType == DEBATE`에서 `DEBATE || FINISH`로 바뀌었다. 릴스 카드에만 해당하고 홈
  피드(`/articles`)와 기사 세부 응답은 여전히 debate가 없다.
- 실측: 시드로 남아 있던 FINISH 기사 7844를 `GET /api/v1/reels/7844`로 받으면 이제
  `contentType: "FINISH"`에 `debate`가 통째로 인라인이다. 토큰을 실으면 `myVote`도
  FINISH 인라인에 그대로 채워진다 — 마감 결과에서 "내가 고른 쪽" 표시가 추가 호출 없이
  된다는 뜻이다.
- `GET /api/v1/debates`(토론 리스트)는 의도적으로 무변경이다. 여전히 열린 토론만 온다.
  BE 결정 문서에도 "FINISH 결과는 릴스·기사 세부의 인컨텍스트에서만 본다"고 명시돼 있다.
- 릴스 카드 debate 스키마는 기존 8필드 그대로고 새 필드는 없다. FINISH에 투표를 쏘면
  전처럼 `409 DEBATE_CLOSED`다.

정리하면 FE가 가정해도 되는 계약이 이렇게 바뀌었다: 릴스 카드의 `debate`는 DEBATE든
FINISH든 채워지고, GENERAL(토론 없음)만 null이다. 투표 가능 여부는 debate 유무가 아니라
`contentType`으로 가른다.

## FE 수정

수정은 세 갈래였다.

첫째, 우회 제거. 모바일 `ReelDetailSheet`와 웹 `ReelDetailPanel`에서 `useArticleDebate`
호출과 `closedDebate` 분기를 지우고, 기사 세부(`ArticleBody`)와 똑같이
`<DebateVoteCard debate={reel.debate} closed={reel.contentType === "FINISH"} />` 한 줄로
통일했다. 원래는 열린 릴이면 `DebateVoteCard`(뮤테이션 포함), 마감 릴이면 따로 받은
데이터로 `VoteCard`(표시 전용)를 그리는 두 갈래였는데, `DebateVoteCard`가 이미 `closed`
prop을 받아 안에서 상호작용을 죽이므로 분기 자체가 필요 없어졌다. 이제 마감 판정 경로가
기사 세부와 릴 세부에서 완전히 같다.

둘째, 회귀 방지. 릴의 "토론 중" 칩이 문제였다. 기존 판정이 `reel.debate != null` 하나였는데,
이건 "마감 릴은 debate가 null이라 자연히 빠진다"는 옛 계약에 기대던 코드다. BE가 마감
릴에도 debate를 주기 시작한 순간 이 코드는 마감 릴에 "토론 중" 칩을 붙이는 버그가 된다 —
BE 수정만 믿고 우회 제거만 했으면 새 버그를 하나 만들 뻔했다. 모바일·웹 `ReelItem` 둘 다
`reel.debate && reel.contentType !== "FINISH"`로 바꿨다.

셋째, 죽은 코드 정리. `useArticleDebate` 훅(모바일·웹 한 벌씩)과 그 훅만 쓰던 쿼리키
`debateKeys.article`을 지웠다. `getArticleDebate` fetcher 자체는 기사 세부 페이지가
계속 쓰므로 남긴다. 옛 계약을 서술하던 주석들(`@plick/domain` 타입 문서, `reels.ts`
응답 타입, `VoteCard`·`DebateVoteCard` JSDoc)도 새 계약으로 고쳤다 — 특히 "마감 릴은
null로 온다"류 문장을 그대로 두면 다음 사람이 코드보다 주석을 믿고 또 우회를 만들 수 있다.

## 검증에서 한 번 놀란 것: 익명 GET 캐시

브라우저 검증 중에 잠깐 미궁에 빠졌다. 마감 릴(7844)은 딥링크로 들어가니 칩 없이 마감
카드가 인라인 데이터로 잘 그려졌고 별도 debate 요청도 없었다. 그런데 열린 릴(8032)로
가니 "토론 중" 칩이 안 보였다. 내 칩 수정이 열린 릴까지 죽였나 싶어 DOM을 뒤졌는데,
`/be` 프록시로 직접 fetch하면 분명 `contentType: "DEBATE"`에 debate가 인라인으로 왔다.
서버가 심어 준 RSC 씨앗을 열어 보니 거기만 `"GENERAL", debate: null`이었다.

원인은 코드가 아니라 캐시였다. `apiFetch`는 익명 GET을 `next: { revalidate: 60 }`으로
Next 데이터 캐시에 태운다(크롤러 경로 최적화). 서버 씨앗이 60초 전 응답 — 정확히는 검증
시드가 이 기사를 DEBATE로 만들기 전 응답 — 을 재사용한 거였다. 리로드 한 번에 재검증이
돌아 칩이 정상적으로 떴다. 코드를 의심하기 전에 서버 응답과 클라 응답을 나란히 놓고
비교한 게 시간을 아꼈다. 릴스 검증 중 데이터가 이상하면 계정·조회 이력 다음으로 이 60초
캐시도 의심 목록에 올려야 한다.

나머지 검증: 마감 릴 시트에 "마감" 배지 + 8표 67% / 4표 33% + "마감 · 12명 투표"가
공유 DB 실값과 일치하게 그려졌고, 네트워크에 `/articles/{id}/debate` 요청이 더는 없다.
열린 릴은 칩·투표 UI("6명 참여 · 투표하면 결과가 열려요") 그대로다. `check-types`,
`lint`, `format:check` 전부 통과.

## 남긴 것

- 토론 리스트 화면은 손대지 않았다 — `GET /debates`가 여전히 열린 토론만 주는 게 BE의
  의도된 결정이라, "리스트엔 진행 중만"이라는 FE 가정이 그대로 유효하다.
- 이번 수정으로 마감 릴도 `DebateVoteCard`(뮤테이션 포함)를 지나가지만, `closed`면
  `VoteCard`가 트랙 버튼을 disabled로 그려 투표 요청 자체가 나갈 수 없다. 혹시 뚫려도
  BE가 409로 막는다.
