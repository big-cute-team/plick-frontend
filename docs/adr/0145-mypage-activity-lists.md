# 0145. 마이페이지 활동 리스트, 좋아요한 기사와 내가 쓴 댓글 (KAN-495)

2026-09-15. 브랜치 `feature/KAN-495-mypage-activity`.
관련: [ADR 0044](0044-article-like-api.md) 유저별 읽기에 토큰을 싣는 자리와 `syncLikeIntoFeeds`의 전신,
[ADR 0048](0048-view-state-restore.md) 피드 캐시 30분과 뷰 상태 복원, [ADR 0085](0085-refresh-flicker-and-cross-site-banner.md)
`restartFeedQuery`, [ADR 0011](0011-shared-code-boundary.md) 무엇을 core로 올리는가.

## 티켓이 요구한 것

마이페이지에 내 활동을 리스트로 보여준다. 좋아요를 눌러도 흔적이 남는 곳이 없어서 지금은 좋아요가
일회성 클릭으로 끝난다는 게 출발점이었다. 누른 기사가 쌓여 보이면 "나중에 다시 볼 기사 저장"이라는
용도가 생기고 그 목록이 재방문 이유가 된다는 게 회의(09-12, FE-14·BE-10)의 논리다.

BE는 셋을 develop에 머지해 뒀다(KAN-492·493·494).

| 메서드 | 경로                                      | 응답                                                                                                                                         |
| ------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/users/me/likes?cursor=&size=`    | `{ items: [피드 카드], nextCursor }`, `likedByMe`는 항상 true                                                                                |
| GET    | `/api/v1/users/me/comments?cursor=&size=` | `{ items: [{ commentId, content, createdAt, isEdited, isBlinded, likeCount, article: { articleSummaryId, title, imageUrl } }], nextCursor }` |
| GET    | `/api/v1/users/me/activity`               | `{ likeCount, commentCount }`                                                                                                                |

완료 조건은 탭 둘, 홈 피드 카드 재사용, 댓글 항목은 본문·기사 제목·썸네일, nextCursor 무한 스크롤, 상단
활동 개수, 빈 상태, size 1..30, 커서 400이면 첫 페이지부터, 좋아요 취소 시 목록에서 즉시 제거, 게스트는
소셜 연동 유도였다. 피그마는 없었다.

## 목록을 마이페이지에 직접 펼치지 않았다

티켓 문장은 "마이페이지에 좋아요한 기사 탭과 내가 쓴 댓글 탭을 만든다"였다. 그대로 읽으면 `/me`에
탭과 무한스크롤 목록을 넣는 것이다. 그런데 지금 `/me`는 프로필 카드, 응원팀 카드, 설정 줄(차단 목록·FAQ·
약관·개인정보), 로그아웃, 탈퇴, 버전 라벨까지 한 화면이다. 그 사이에 끝없이 자라는 목록을 두면 목록
아래 항목엔 영영 닿지 못하고, 목록 위에 두자니 로그아웃 버튼이 목록보다 먼저 온다.

그래서 한 단계 아래 화면 `/me/activity`로 뺐다. `/me`에는 활동 카드를 두어 좋아요 수·댓글 수를 타일
둘로 보여주고, 타일을 누르면 활동 화면의 그 탭으로 들어간다. 티켓의 "상단에 활동 개수"는 이 카드가
맡고, 활동 화면에서는 탭 라벨 옆에 같은 숫자를 붙였다. 차단 목록(`/me/blocked`)이 이미 같은 구조로
있어서 상단바(뒤로가기 + 중앙 타이틀)와 진입 방식을 그대로 따랐다.

## 탭의 원본은 URL이다

어느 탭을 보고 있는지를 컴포넌트 state로 들지 않고 `?tab=likes|comments`로 뒀다. 기사 페이지가 팀
필터를 `/articles/teams/[slug]`로 둔 것과 같은 판단이다. 새로고침해도 보던 탭이 그대로고, 마이페이지의
타일이 `?tab=comments`로 댓글 탭을 골라 들어올 수 있다. 탭을 바꿀 때는 `history.replaceState`로 URL만
바꾼다. Next 앱 라우터는 네이티브 `pushState`/`replaceState`를 가로채 `useSearchParams`를 같이
갱신하므로 서버 왕복도 리마운트도 없다. 탭 선택이 히스토리에 쌓이지 않아 뒤로가기는 마이페이지로
곧장 간다.

서버 컴포넌트도 같은 값을 `searchParams`로 읽어서 그 탭의 첫 페이지를 미리 받아 씨앗으로 내려준다.
어느 탭이든 첫 화면이 서버 HTML에 실려 스켈레톤 없이 뜬다.

## 캐시가 씨앗을 이기는 문제

여기서 한참 고민했다. 홈·기사·릴스 피드는 서버가 받은 첫 페이지를 `initialData`로 심고 30분
(`FEED_FRESH_MS`) 동안 캐시를 믿는다. `initialData`는 캐시가 빌 때만 쓰이므로, 한 번 본 화면에 30분 안에
다시 들어오면 서버가 새로 받아 내려준 첫 페이지는 버려지고 캐시의 옛 목록이 그대로 보인다. 피드에서는
그게 의도였다. 새 글이 몇 분에 한두 개라 자동 갱신 대신 당겨서 새로고침을 둔 것이다(KAN-314).

활동 목록은 사정이 다르다. 목록을 바꾸는 건 남이 아니라 나다. 활동 화면을 봤다가 홈에서 기사 하나에
하트를 누르고 다시 들어왔는데 목록에 없으면 "저장이 안 됐나" 싶어진다. 그렇다고 `staleTime`을 짧게 주면
무한 쿼리 refetch가 쌓인 페이지를 전부 순차로 다시 받는다(커서 체인이라 병렬도 안 된다). 이게 30분 캐시를
둔 이유였으니 되돌릴 수 없다.

택한 건 씨앗 우선이다. 마운트 때 캐시의 `dataUpdatedAt`과 씨앗의 `fetchedAt`을 비교해 씨앗이 새것이면
`setQueryData`로 첫 페이지 하나짜리 캐시로 갈아 끼운다(`useFreshSeed`). 서버를 다시 부르지 않는다.
어차피 서버 렌더가 첫 페이지를 받고 있었고 그 결과가 버려지고 있었을 뿐이다. 소프트 내비게이션으로
들어오면 Next가 RSC를 새로 받아 오므로 씨앗이 늘 캐시보다 새롭고, 뒤로가기로 돌아오면 Next가 라우터
캐시의 옛 RSC를 그대로 쓰므로 씨앗이 캐시보다 오래돼 아무 일도 안 한다. 뒤로가기에서는 쌓아 둔
페이지와 스크롤 자리가 그대로 남아야 하니 딱 맞는 동작이다.

한 가지 함정이 있었다. 기기 시계가 서버보다 뒤처지면 씨앗 시각이 미래라 `Math.min(fetchedAt, now)`로
깎는데, 그러면 캐시에 적힌 시각이 씨앗 시각보다 늘 작아서 "씨앗이 더 새롭다"는 판정이 매번 참이 된다.
렌더마다 비교하면 갈아 끼우기와 리렌더가 서로를 부르며 돈다. 그래서 `useRef`로 마운트당 한 번만
비교한다.

## 좋아요를 끄면 목록에서 바로 빠지는 것

서버는 좋아요를 행 삭제로 처리해 다음 조회부터 빠진다고 했고, 화면의 즉시 반영은 FE 몫이라고 못박아
뒀다. 기사 세부의 좋아요 버튼은 이미 `syncLikeIntoFeeds`로 캐시된 홈·기사·릴스 피드의 같은 카드에
`liked`·`likeCount`를 옮겨 적고 있었다(KAN-379). 좋아요한 기사 목록도 같은 카드 모양이라 거기에 키
하나만 더하면 됐다. 그리고 목록은 `liked`가 false인 카드를 그리지 않는다. 캐시에서 항목을 지우지 않는
이유는 다시 켜면 되살아나야 해서다.

이 때문에 쿼리키(`activityKeys`)가 `@plick/core`에 갔다. 첫 사용처가 모바일뿐이면 앱 레이어에 두는 게
규칙인데, `like-sync.ts`가 core에 있고 그게 이 키를 알아야 한다. 앱에 두면 core가 앱을 역참조한다
(ADR 0011 게이트 A). fetcher와 타입은 규칙대로 앱에 남겼다.

릴스의 좋아요(`useReelLike`)는 릴스 피드 캐시만 손으로 고치고 있었다. 릴에서 하트를 눌러도 활동
목록에 반영돼야 하니 `syncLikeIntoFeeds`를 타게 바꿨다. 덤으로 릴에서 누른 하트가 홈·기사 피드에도
따라가게 됐다.

활동 개수는 캐시로 못 맞춘다. 목록에 없는 기사(다음 페이지, 혹은 홈에서 누른 것)일 수 있어서다.
`syncLikeIntoFeeds`와 댓글 작성·삭제가 개수 키를 `invalidateQueries`로 stale 처리만 해 두고, 활동
화면이 다시 마운트될 때 한 번 센다. 값 하나짜리 요청이라 무한 쿼리처럼 줄줄이 받을 걱정이 없다.

댓글은 두 갈래다. 삭제는 `useDeleteComment`가 내 댓글 목록 캐시에서 그 줄을 뺀다. 기사 댓글 목록에서는
tombstone으로 남기지만 이 API는 삭제한 댓글을 아예 내려주지 않으니 tombstone으로 두면 다음 refetch 때
사라지며 깜빡인다. 작성은 끼워 넣을 수 없다. 내 댓글 항목은 기사 제목·썸네일을 들고 있는데 작성 훅에는
기사 id뿐이다. 그래서 캐시를 첫 페이지 하나로 줄이고 `refetchType: "none"`으로 stale 표시만 해 둔다.
다음 마운트 때 첫 페이지 하나만 다시 받아 새 댓글이 맨 위에 온다.

## 게스트는 아직 없다

티켓의 "게스트 상태에서는 소셜 연동 유도"는 자동 게스트 계정(회의록 BE-11·FE-17)을 전제한다. 그런데
BE 설계 문서를 보니 그건 "구현 방식 미정"이고, FE에 게스트라는 상태는 없다. 지금의 비로그인은 토큰이
없는 상태뿐이다. 그래서 목록 대신 로그인을 권하는 카드(`ActivityLoginPrompt`)를 그리고 로그인 화면으로
보낸다. 게스트 계정이 생기면 이 카드의 문구와 목적지를 소셜 연동으로 바꾸면 된다. 차단 목록처럼
로그인으로 redirect하지 않은 건 티켓이 "리스트 대신 유도 화면"을 요구해서다.

## 로컬 BE가 옛 빌드였다

계약 검증을 `be-verify`에 맡겼더니 세 경로가 전부 404 `COMMON_NOT_FOUND`로 돌아왔다. 떠 있는
`localhost:8080`이 9월 8일에 IDE에서 띄운 프로세스라 `MyActivityController`가 없었다. 소스 체크아웃은
develop `06819ad`로 새 코드가 있는데 빌드가 낡은 것이다.

IDE가 띄운 프로세스라 죽이지 않고 8082에 두 번째 인스턴스를 띄우기로 했다(8081은 다른 java 프로세스가
잡고 있었다). 로컬 프로필의 히카리 풀이 3이라 공유 풀러 한도(15)에도 여유가 있다. `.claude/launch.json`에
`backend-8082`(gradle bootRun, 관리 포트 9468)와 `mobile-8082`(prod 빌드를 `API_BASE_URL=8082`로
`next start`, 3012)를 넣었다. `preview_start`는 저장소 밖 실행 파일을 막아서(`./gradlew: Operation not
permitted`) BE는 백그라운드 셸로 띄웠다.

그랬더니 이번엔 `Schema-validation: missing column [age_range] in table [users]`로 죽었다. KAN-475
(카카오 연령대·성별)가 `users`에 컬럼 둘을 더했는데 공유 Supabase에는 아직 없다. BE는 `ddl-auto:
validate`에 마이그레이션 도구가 없어 수동 DDL이다. 이건 공유 DB라 혼자 결정하지 않는다. 같은 이유로 IDE
BE를 지금 코드로 재시작해도 똑같이 죽는다.

그래서 이 세션은 여기까지가 코드고, 런타임 검증은 DDL 적용 뒤로 미뤘다. 적용할 문장은 BE
`src/test/resources/schema.sql`의 그대로다.

```sql
ALTER TABLE public.users
  ADD COLUMN age_range character varying(10),
  ADD COLUMN gender character varying(10),
  ADD CONSTRAINT chk_user_age_range CHECK (((age_range)::text = ANY ((ARRAY['1~9'::character varying, '10~14'::character varying, '15~19'::character varying, '20~29'::character varying, '30~39'::character varying, '40~49'::character varying, '50~59'::character varying, '60~69'::character varying, '70~79'::character varying, '80~89'::character varying, '90~'::character varying])::text[]))),
  ADD CONSTRAINT chk_user_gender CHECK (((gender)::text = ANY ((ARRAY['MALE'::character varying, 'FEMALE'::character varying])::text[])));
```

## 만든 것

| 조각                                                                                            | 위치                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 쿼리키 `activityKeys`                                                                           | `packages/core/src/activityKeys.ts`               |
| `syncLikeIntoFeeds`에 활동 목록 키·개수 무효화                                                  | `packages/core/src/like-sync.ts`                  |
| `FeedCardResponse`·`toArticleCard` export                                                       | `packages/core/src/articles.ts`                   |
| 타입 `MyComment`·`MyCommentPage`·`MyActivityCounts`·`InitialActivity`                           | `apps/mobile/app/_types/activity.ts`              |
| 상수(페이지 크기, 탭, 문구)                                                                     | `apps/mobile/app/_constants/activity.ts`          |
| 탭 ↔ URL                                                                                        | `apps/mobile/app/_utils/activity.ts`              |
| fetcher 셋                                                                                      | `apps/mobile/app/_services/activity.ts`           |
| 훅 `useFreshSeed`·`useLikedArticles`·`useMyComments`·`useMyActivityCounts`·`useActivityRefresh` | `apps/mobile/app/_hooks/`                         |
| 활동 화면                                                                                       | `apps/mobile/app/me/activity/`                    |
| 마이페이지 활동 카드                                                                            | `apps/mobile/app/me/_components/ActivityCard.tsx` |
| `ScreenKey`에 `activity`                                                                        | 스크롤 위치 복원과 탭 전환 시 맨 위로             |

## 지금까지 눈으로 본 것

BE 없이 볼 수 있는 상태는 prod 빌드(`next start`, 3101, BE는 옛 8080)로 밟았다.

- 비로그인 `/me/activity`: 로그인 카드가 상단바 아래 카드 섀시로 뜬다.
- 로그인(민팅 토큰) `/me`: 프로필·응원팀 카드 아래 "내 활동" 카드가 붙고, 개수 조회가 404라 타일에
  숫자 없이 라벨만 있다. 진입은 된다.
- 로그인 `/me/activity`: 탭 둘이 sticky로 뜨고, 목록 자리에 "불러오지 못했어요" + 다시 시도.
  "내가 쓴 댓글"을 누르면 리로드 없이 URL이 `?tab=comments`로 바뀌고 탭과 목록 자리가 따라온다.
- 콘솔 에러는 옛 BE의 404뿐이다.

check-types, lint, format:check, mobile build 통과.

## 남은 것

- 공유 DB에 KAN-475 DDL 적용 뒤 8082 BE를 띄워 `be-verify`로 세 계약을 실제 응답으로 대조하고,
  로그인 상태의 목록·무한 스크롤·빈 상태·좋아요 취소 반영을 브라우저로 밟는다.
- 게스트 계정(BE-11)이 생기면 `ActivityLoginPrompt`를 소셜 연동 유도로 바꾼다.
- web 이식 때 `_types/activity.ts`·`_services/activity.ts`를 `@plick/domain`·`@plick/core`로 올린다.
