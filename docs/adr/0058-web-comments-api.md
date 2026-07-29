# ADR 0058 — web 댓글 조회·작성 API 이식 (KAN-329)

- 날짜: 2026-07-29
- 브랜치: `feature/KAN-329-web-comments-api`
- 관련: [ADR 0042 모바일 댓글 API](0042-comments-api.md) ·
  [ADR 0043 댓글 UX 보정](0043-comment-ux-fixes.md) ·
  [ADR 0054 web 기사 상세 API](0054-web-article-detail-api.md) ·
  [ADR 0055 web 릴스 API](0055-web-reels-feed-api.md) ·
  [ADR 0011 공용 경계](0011-shared-code-boundary.md) · `api-integration` 스킬 `web-wiring.md`

## 무엇을 했나

데스크톱 웹의 댓글을 실제 API로 갈아탔다. 붙인 엔드포인트는 둘이다.

- `GET /api/v1/articles/{articleId}/comments` — 커서 페이지네이션 목록
- `POST /api/v1/articles/{articleId}/comments` — 원 댓글·답글 작성

지금까지 web의 댓글 자리는 헤더 카운트와 아무 데도 안 붙은 입력바, 그리고 "아직 댓글이
없어요" 한 줄이 전부였다. 기사 세부(KAN-322)와 릴 세부 패널(KAN-323)을 붙일 때 댓글은
별도 엔드포인트라며 미뤄 뒀던 자리다. 그걸 이번에 채웠다.

모바일이 KAN-303에서 이미 붙인 엔드포인트라 계약을 새로 캐낼 필요는 없었다. web-wiring.md
§1대로 모바일 코드가 검증된 계약이고, BE가 바뀐 정황도 없어서 be-verify는 부르지 않았다.
그래서 이번 티켓의 본편은 계약이 아니라 승격 판단이었다. 그리고 승격은 예고돼 있던 대로
거의 그대로 진행됐다.

## 승격 — 후보 목록에 적혀 있던 그대로

`web-wiring.md` §2의 승격 후보 목록에 `_types/comments.ts`와 `_services/comments.ts`,
`_queries/commentKeys.ts`가 이미 이름이 올라 있었다. ADR 0011 게이트 셋으로 다시 확인해도
전부 통과였다.

- 게이트 A(앱 역참조 금지): 셋 다 앱 내부를 안 본다. 타입은 순수 타입이고, fetcher는
  `apiFetch`와 도메인 타입만 쓰고, 쿼리키는 문자열 배열이다.
- 게이트 B(동일성): 계약 타입과 fetcher, 쿼리키는 표현이 아니라 데이터라 두 앱에서 같아야
  한다. 오히려 갈리면 사고다 — 쿼리키가 앱마다 다르면 무효화 규약이 조용히 어긋난다.
- 게이트 C(성숙도): web이 두 번째 실사용처다. BE로 shape가 굳은 지 오래고, 모바일에서
  기사 세부와 릴 시트 두 화면이 이미 쓰고 있다.

옮긴 것은 이렇다.

- `ArticleComment`·`CommentPage`·`InitialCommentPage`·`CreateCommentResult`:
  모바일 `_types/comments.ts` → `@plick/domain/types`. 파일째 소멸.
- `getComments` + `CommentResponse` + `toComment` + `COMMENTS_PAGE_SIZE` +
  `COMMENT_MAX_LENGTH`: 모바일 `_services/comments.ts`·`_constants/comments.ts` →
  `@plick/core/comments`. 두 파일 모두 소멸.
- `commentKeys`: 모바일 `_queries/commentKeys.ts` → `@plick/core/commentKeys`. 소멸.
  모바일 `_queries/`엔 이제 `QueryProvider.tsx`만 남았다.

상수 둘을 어디에 둘지는 잠깐 고민했다. `COMMENTS_PAGE_SIZE`는 fetcher의 기본 인자라
fetcher를 따라가는 게 자명한데, `COMMENT_MAX_LENGTH`는 입력바가 `maxLength`로 쓰는
UI 쪽 값이라 앱 상수처럼 보이기도 했다. 결론은 core로 보내는 쪽이었다. 이건 화면이
정한 숫자가 아니라 BE 검증(1~500자)을 클라에 미리 복사해 둔 계약 상수다. 앱마다 다르게
잡으면 한쪽만 400을 더 자주 맞는다. 마침 `@plick/core/articles`에 이미 같은 성격의
`ARTICLES_MAX_PAGE_SIZE`가 살고 있어서 전례도 있었다.

반대로 안 올린 것도 명확했다.

- `comment-actions.ts`(`"use server"` 서버 액션): 쿠키 이름이 앱에 박혀 있고 파일이 얇다.
  web에 복제했다. 이건 web-wiring.md가 처음부터 못 박아 둔 규칙이다.
- `useComments`·`useCreateComment`: React 훅이라 core의 순수 모듈 경계 밖이다. 승격분을
  다 걷어내고 나면 남는 건 얇은 껍데기라 복제가 싸다(KAN-321·KAN-323과 같은 판단).
- `CommentList`·`CommentThread`·`CommentComposer`: 표현이라 앱별. 실제로 마크업이 갈린다
  (web은 `hover:`·`focus-visible:`이 붙고 모바일은 `active:opacity-60`이다).

## `Comment`를 드디어 지웠다

`@plick/domain/types`에는 퍼블리싱 단계에서 BE 목표 shape를 추정해 만든 `Comment`가 있었다.
작성자가 핸들(`@kop_anfield`)이고 시각이 표시 문자열(`"12분 전"`)이고 삭제·수정 플래그가
없는 타입이다. 실계약은 전부 다르다 — 닉네임 하나, ISO 시각, tombstone과 `isEdited`.
그래서 모바일은 KAN-303에서 이 타입을 안 쓰고 앱 로컬에 실계약 타입을 새로 만들었고,
`Comment`의 마지막 소비자로 web `CommentThread` 하나가 남아 있었다.

이번에 그 마지막 소비자가 `ArticleComment`로 갈아탔다. web-wiring.md §2가 "마지막 소비자가
사라지는 PR에서 지운다"라고 정해 둔 시점이 지금이라 `Comment`를 삭제했다. 딸려서
`FeedPost.comments?: Comment[]` 필드도 지웠다 — 남겨 두면 지워진 타입을 참조해 컴파일이
깨지고, 마침 web 사이드바 목데이터에는 `comments`가 들어 있지도 않았다. `FeedPost` 자체는
아직 사이드바 목(실시간 인기·마이팀 카드)이 물고 있어서 남겼다.

## web에 새로 만든 것

데이터 레이어는 승격분 import + 서버 액션 복제 + 훅 복제로 끝났고, 화면 쪽에 새로 만든 게
좀 있다.

- `_components/CommentList.tsx`: 목록 + 로딩 스켈레톤 + 에러·재시도 + 빈 상태 +
  "댓글 더 보기". 모바일 것을 데스크톱 관용으로 옮겼다.
- `_components/LoginPromptDialog.tsx`: 비로그인 게이트 팝업. web엔 없던 컴포넌트라
  `ErrorDialog`의 스크림 + 카드 관용에 X 닫기와 "로그인 하러 가기"를 얹어 새로 만들었다.
- `articles/[postId]/_components/ArticleComments.tsx`: 헤더 카운트·입력바·목록을 묶는
  클라 경계. 모바일에 같은 이름의 같은 역할 컴포넌트가 있다.

`CommentThread`와 `CommentComposer`는 기존 파일을 실계약 기준으로 다시 썼다.

### 포털이 필요했던 이유

`LoginPromptDialog`는 모바일 것과 마찬가지로 `createPortal`로 body에 뚫는다. 처음엔
"web은 바텀시트가 없으니 그냥 제자리에 그려도 되지 않나" 싶었는데, 릴 세부 패널이
`translateX`로 미끄러진다는 걸 떠올리고 그대로 두기로 했다.

이유를 풀어 쓰면 이렇다. `position: fixed`는 보통 뷰포트를 기준 상자로 쓰지만, 조상 중
하나라도 `transform`이나 `filter`, `perspective`가 걸려 있으면 그 조상이 기준 상자가 된다
(CSS containing block 규칙). 릴 세부 패널은 열고 닫을 때 `translate-x-full ↔ translate-x-0`을
토글하므로 항상 `transform`이 걸린 상태고, 그 안에서 `fixed inset-0`을 그리면 화면 전체가
아니라 패널 영역만 덮는다. 스크림이 릴 뷰어를 안 가리고 패널 안쪽만 어둡게 만든다는 뜻이다.
body 밑으로 옮기면 조상 체인이 끊겨 어디서 부르든 화면 전체를 덮는다.

포털 대상인 `document`는 서버 렌더에 없으므로 마운트 이후에만 그린다(`mounted` 플래그).
안 그러면 하이드레이션 불일치가 난다.

## 기사 세부는 씨앗을 심고, 릴 패널은 안 심는다

같은 목록 훅을 쓰는데 두 화면의 첫 로드 방식이 다르다. 이건 모바일과 같은 구조를 그대로
가져온 것이다.

기사 세부는 서버 컴포넌트가 상세와 댓글 첫 페이지를 `Promise.allSettled`로 병렬로 받아
`InitialCommentPage`(페이지 + 받은 시각)로 묶어 내려보낸다. 그 값이 `useInfiniteQuery`의
`initialData`가 되어 클라 캐시의 씨앗이 된다. 안 심으면 목록 훅이 마운트되자마자 서버가
방금 받은 것과 똑같은 페이지를 한 번 더 받는다(이중 페치).

`allSettled`를 쓴 건 댓글 실패가 페이지를 죽이면 안 되기 때문이다. `Promise.all`이었으면
댓글 fetch 하나가 넘어질 때 기사 본문까지 통째로 에러 화면이 된다. `allSettled`로 갈라
두면 기사가 성공하고 댓글만 실패한 경우 씨앗 없이 내려보내고, 목록이 클라에서 다시 받으며
자기 자리에서 에러와 재시도 버튼을 보여준다. 반대로 기사 자체가 404(`ARTICLE_NOT_FOUND`)나
400(`COMMON_INVALID_PARAM`)이면 기존대로 `notFound()`로 보낸다.

씨앗에 시각(`fetchedAt`)을 같이 묶는 이유도 그대로다. 데이터만 넘기면 RQ는 그걸 방금 받은
것으로 취급해서, 서버가 캐시된 응답을 준 경우 묵은 데이터가 `staleTime` 내내 신선한 척한다.
받은 시각을 `initialDataUpdatedAt`으로 못박아야 신선도 계산의 기준점이 맞는다. 기기 시계가
뒤처져 미래 시각으로 보이면 영영 신선해지므로 `Math.min(fetchedAt, Date.now())`로 깎는다.

릴 세부 패널은 반대로 씨앗이 없다. 패널이 클라에서 열리기 때문이다 — 릴 피드를 서버가
렌더할 때는 어느 릴의 댓글을 보게 될지 모른다. 그래서 패널이 열려 `CommentList`가 마운트되는
순간 첫 페이지를 받는다. 릴 카드 id가 곧 BE `articleSummaryId`라서 기사 세부와 같은 fetcher,
같은 쿼리키를 쓴다.

## 헤더 카운트는 왜 로컬로 더하나

댓글 수의 원본은 기사 상세 응답의 `commentCount`(또는 릴 카드의 그것)다. 그건 서버가 렌더
시점에 받은 스냅샷이라 방금 내가 단 댓글을 모른다. 그래서 등록이 성공할 때마다 화면이
로컬로 하나씩 올린다. 기사 세부는 `ArticleComments`가, 릴 패널은 `ReelDetailPanel`이 그
카운터를 든다.

목록 자체는 따로 손대지 않아도 새 댓글이 나타난다. 작성 뮤테이션이 성공 응답(BE가 201로
생성된 댓글 객체를 그대로 준다)을 같은 쿼리키의 캐시에 끼워 넣기 때문이다. 원 댓글은 첫
페이지 맨 앞에(최상위가 최신순), 답글은 부모의 `replies` 끝에(답글은 오래된순) 들어간다.
전체 무효화(`invalidateQueries`)를 일부러 안 쓰는데, 무한 쿼리를 무효화하면 쌓인 페이지를
전부 순차로 다시 받기 때문이다 — 커서 체인이라 앞 페이지 응답이 와야 다음 커서를 알아
병렬도 안 된다.

## 릴 패널에서 걸린 것 — 카운터가 릴을 갈아타도 안 리셋됐다

모바일 릴 세부는 바텀시트가 릴마다 새로 마운트되므로 로컬 카운터가 자연히 초기화된다.
그런데 web 패널은 다르다. 닫힘 애니메이션 동안 내용이 보여야 해서 마지막 릴을 `rendered`
state로 붙들어 두고 패널을 계속 마운트해 두는 구조다(KAN-323). 여기에 `addedComments`를
그냥 얹었더니 A 릴에서 댓글을 하나 달고 닫은 뒤 B 릴을 열면 B의 헤더가 `B.commentCount + 1`로
떴다. A에서 센 수가 그대로 따라온 것이다.

릴 id가 바뀔 때 리셋하는 효과를 따로 뒀다.

```tsx
const reelId = reel?.id;

useEffect(() => {
  if (reel) setRendered(reel);
}, [reel]);

/* 다른 릴로 갈아타면 앞 릴에서 센 수는 의미가 없다 */
useEffect(() => {
  if (reelId) setAddedComments(0);
}, [reelId]);
```

처음엔 `setRendered`의 업데이터 안에서 이전 릴과 id를 비교해 한 효과로 합치려 했는데,
업데이터 함수 안에서 다른 state를 세팅하는 건 렌더 중 부수효과라 React가 싫어한다.
효과를 둘로 나누고 의존성을 각각 `reel`과 `reelId`로 잡는 쪽이 짧고 명확했다. `reel`
객체는 RQ 캐시에서 오므로 같은 릴이어도 렌더마다 참조가 바뀔 수 있어서, 리셋 판단은
객체가 아니라 id로 해야 한다.

## 검증하다 잠깐 헤맨 것 — 클릭이 안 먹는 줄 알았다

dev(:3000)에서 화면을 밟는데 댓글 등록 버튼을 눌러도 아무 일이 없었다. 입력값은 들어가
있고 버튼도 disabled가 아닌데 요청이 안 나갔다. 브라우저 콘솔도 깨끗했다.

`document.elementFromPoint`로 버튼 좌표에 뭐가 있는지 찍어 보고 나서야 알았다. 그 자리에
있던 건 버튼이 아니라 `aria-label="닫기"`인 전체 화면 스크림 버튼이었다. 즉 비로그인
게이트가 정상 동작해서 로그인 유도 팝업이 이미 떠 있었고, 그게 화면을 덮고 있었던 것이다.
팝업이 포털로 body에 붙어 있어서 `<main>` 기준으로 텍스트를 뽑아 보던 나한테만 안 보였다.
버그가 아니라 내가 만든 기능이 잘 동작하고 있었던 셈이다.

그 다음은 순서대로 밟았다. 토큰을 민팅해(`scripts/be-verify/mint-jwt.mjs`) 쿠키로 심고
다시 들어가서 원 댓글 등록(카운트 4→5, 입력값 비워짐, 목록 맨 앞에 삽입), 답글 등록
(카운트 5→6, 스레드 자동 펼침, 인라인 입력바 접힘), 릴 패널 등록(카운트 0→1)까지 확인했다.

공유 DB라 만든 댓글은 전부 지웠다. 지우고 나니 화면이 tombstone("삭제된 댓글이에요.")으로
바뀌는 것까지 덤으로 확인됐다 — 삭제된 원 댓글에 딸린 답글이 그대로 남아 보이는 것도
계약대로였다.

## 안 한 것

댓글 좋아요(`POST·DELETE /api/v1/comments/{commentId}/like`)는 별도 엔드포인트라 이번
티켓 밖이다. 그래서 web의 댓글 하트는 표시 전용으로 뒀다 — 응답의 `likeCount`와 `liked`를
그리기만 하고 누르는 동작은 없다. 모바일은 KAN-309에서 이미 붙였으니 web도 그 이식
티켓에서 `useCommentLike`를 복제하면 된다. 기사 좋아요 버튼이 지금 같은 상태(표시 전용)인
것과 결이 같다.

댓글 수정·삭제는 BE에 엔드포인트가 있지만(`PATCH`·`DELETE /api/v1/comments/{id}`) 모바일도
아직 안 붙였다. 화면에 진입점이 없으니 web에서 먼저 만들 이유가 없다.

## 검증

- `pnpm check-types`, `pnpm lint`, `pnpm format:check` 통과.
- `pnpm --filter web build`, `pnpm --filter mobile build` 둘 다 통과 —
  `@plick/domain`과 `@plick/core`를 건드렸으니 양쪽을 다 돌렸다.
- dev(:3000) 데스크톱 1280에서 기사 세부·릴 패널의 목록, 원 댓글·답글 등록, 답글 토글,
  빈 상태(댓글 0인 기사), tombstone, 비로그인 게이트 팝업 확인.
- 330px에서 가로 오버플로 0(`scrollWidth == innerWidth`), 답글 인라인 입력바(취소 + 전송
  버튼까지) 안 깨짐, 릴 패널 전체 화면 오버레이 확인.

## 다음

`web-wiring.md` §5 이식 순서 기준으로 남은 건 뮤테이션 쪽이다. 좋아요(기사·릴·댓글)와
조회수가 아직 web에 없다. 승격 후보 목록에서 이번에 지워진 항목은 계약 타입·fetcher·쿼리키
셋이고, `_utils`와 훅은 예정대로 앱별 복제로 남았다.
