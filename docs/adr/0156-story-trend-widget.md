# 0156. 실시간 급상승을 이슈 목록으로 바꾸고 이슈 상세 페이지를 만들었다

- 날짜: 2026-09-18
- 티켓: KAN-523 (상위 에픽 KAN-518, 백엔드 KAN-522)
- 관련: [ADR 0149](0149-trending-rankings-and-web-figure-page.md)(급상승 카드와 웹 인물 페이지 첫 구현)

## 무엇이 문제였나

웹 사이드바의 "실시간 급상승" 카드는 KAN-501에서 만들었다. 구단 탭과 선수 탭 두 개가 있고, 각 탭에 순위 여섯 줄이 섰다. 써 보니 두 가지가 걸렸다.

하나는 "토트넘 1위"가 무슨 뜻인지 안 보인다는 점이다. 토트넘이 왜 뜨는지는 결국 기사를 눌러 봐야 안다. 사람들이 궁금한 건 구단이 아니라 "손흥민 사우디 이적설"처럼 지금 도는 이야기다.

다른 하나는 퍼센트 표기다. 순위가 그대로인 줄에는 점수 변화율을 흐린 화살표로 붙여 뒀다(ADR 0149에서 "모든 줄이 가로줄이면 화면이 죽는다"며 넣은 보조 표시). 그런데 이 점수는 전체 대비 점유율이라, 다른 구단 기사가 조금만 늘어도 1위 구단 점수가 떨어진다. 그래서 1위를 지키고 있는데 "▼2.1%"가 붙는 일이 생겼다. 순위 카드에서 순위 말고 다른 숫자가 떨어지면 읽는 사람은 순위가 떨어진 줄 안다.

백엔드가 KAN-522에서 기사 묶음 단위 랭킹(`type=STORY`)을 열었다. 이슈는 같은 이적설을 다룬 기사 여러 건을 백엔드가 하나로 묶은 단위다. 그래서 카드를 이슈 한 목록으로 바꾸고, 퍼센트를 지우고, 이슈를 누르면 그 이슈의 기사만 모아 보는 페이지를 새로 만들었다.

## 계약부터 직접 봤다

평소처럼 로컬 BE(`localhost:8080`)를 먼저 찔러 봤는데 응답이 없었다. 메모해 둔 요령대로 배포된 dev 웹의 `/be` 경로를 썼다. 웹 앱은 `next.config`의 rewrites로 `/be/*`를 백엔드에 그대로 넘기는 프록시라, `https://dev.plick.co.kr/be/api/v1/...`를 curl하면 dev 백엔드의 공개 API가 익명으로 읽힌다. dev API 주소를 몰라도 되는 이유다.

확인한 것:

- `GET /trends?type=STORY&limit=6`은 네 건이 왔다. 원소에 `articleCount`가 새로 붙었고, `type=TEAM`에서는 그 값이 `null`이다. `scoreChangeRate`는 여전히 오지만 티켓대로 쓰지 않는다.
- `GET /stories/50`은 `storyId`, `title`, `articleCount`, `lastArticleAt` 네 개다.
- 없는 id는 404 `STORY_NOT_FOUND`, `abc` 같은 정수가 아닌 id는 400 `COMMON_INVALID_PARAM`이다. 인물 프로필과 같은 패턴이라 not-found 처리도 같게 가면 된다.
- `GET /articles?storyId=44&size=2`는 두 건과 `nextCursor`를 준다. 기존 피드에 필터 하나가 붙은 것뿐이고 커서 형식도 그대로다.

여기서 하나 눈에 띈 게 있다. dev에 이슈가 네 건뿐이다. 티켓의 "3건 미만이면 구단 순위로 대체" 규칙이 실제로 걸릴 수 있는 수준이라, 대체 경로를 장식이 아니라 자주 타는 길로 보고 만들었다.

## 도메인과 core

`TrendType`에 `"STORY"`를 더하고, `TrendItem`에서 `scoreChangeRate`를 빼고 `articleCount: number | null`을 넣었다. 필드를 지운 건 일부러다. 남겨 두면 누군가 또 그 값으로 뭔가를 그린다. 타입에서 사라지면 쓰려는 순간 컴파일이 막는다.

BE 응답 타입(`TrendItemResponse`)에서도 `score`와 `scoreChangeRate`를 뺐다. TypeScript 인터페이스는 JSON에 실제로 오는 키를 제한하지 않는다. 받는 쪽에서 안 읽겠다는 선언일 뿐이라, 백엔드가 다음 계약 변경에서 그 키를 지워도 아무 일도 안 생긴다. 반대로 `articleCount`는 옵셔널(`?:`)로 뒀다. 운영 BE가 아직 KAN-522를 릴리스하지 않았으면 TEAM 응답에 키 자체가 없어서다. 변환할 때 `?? null`로 눕힌다.

새 fetcher `packages/core/src/stories.ts`의 `getStory`를 만들었고, `getArticles`에 `storyId` 인자를, `articleKeys`에 `storyFeed`를 더했다. `packages/domain/src/format.ts`에는 `storyPath`를 넣었다. 링크 문자열을 화면마다 조립하면 나중에 경로가 바뀔 때 한 곳을 놓친다.

## 급상승 카드: 탭이 없어지니 클라 컴포넌트도 없어졌다

전에는 `TrendingSection`(서버)이 구단·선수 랭킹을 둘 다 받아 `TrendingTabs`(클라, `"use client"`)에 넘기고, 탭 상태는 클라에서 `useState`로 들고 있었다. 탭이 사라지면 고를 것이 없으니 상태도 필요 없다. `TrendingTabs.tsx`를 지우고 목록을 서버 컴포넌트에서 바로 그리게 했다.

이게 작은 차이가 아니다. `"use client"` 컴포넌트는 서버에서 HTML로 한 번 그려진 다음, 그 코드가 JS 번들로 브라우저에 내려가 다시 실행되며 이벤트를 붙인다(하이드레이션). 서버 컴포넌트는 서버에서 그린 결과만 내려가고 코드는 번들에 들어가지 않는다. 이 카드는 링크 목록일 뿐이라 브라우저에서 실행할 코드가 하나도 없고, 그래서 서버 컴포넌트가 맞다. 부수 효과로 상대 시각("14분 전 집계")에 달아 둔 `suppressHydrationWarning`도 필요 없어졌다. 서버와 브라우저의 '지금'이 달라 글자가 어긋나는 문제는 브라우저에서 다시 렌더할 때만 생기는데, 이제 다시 렌더하지 않는다.

대체 로직은 `TrendingSection` 안의 `loadRanking`에 넣었다.

1. `getTrends("STORY")`를 부른다. 성공했고 세 건 이상이면 그걸 쓴다.
2. 실패했거나 세 건 미만이면 `getTrends("TEAM")`을 부른다.
3. 그것도 실패하면 null이고 카드는 "불러오지 못했어요"를 그린다.

처음엔 STORY와 TEAM을 `Promise.allSettled`로 동시에 받아 두고 고르는 쪽을 생각했다. 요청이 직렬이면 대체할 때 왕복이 한 번 더 들기 때문이다. 그런데 이슈가 충분한 평소에는 TEAM 응답을 매번 버리게 된다. 이 카드는 부모가 `Suspense`로 감싸 본문보다 늦게 와도 되는 자리라, 대체할 때만 한 번 더 기다리는 쪽이 낫다고 판단했다.

STORY가 400으로 실패하면 로그를 남기지 않는다. 운영 BE가 STORY를 모르는 동안은 모든 요청이 400이라, 찍으면 서버 로그가 그걸로 도배된다. 400 말고 5xx나 네트워크 실패만 `console.error`로 남긴다.

구단으로 대체됐을 때는 제목 옆에 작게 "구단 순위"를 붙였다. 티켓에 없던 표시인데, 안 붙이면 "실시간 급상승" 밑에 갑자기 맨유, 맨시티가 서 있어 무엇의 순위인지 헷갈린다.

줄(`TrendingRow`) 구성은 순위, 이슈 제목(한 줄 말줄임), "기사 N", 변동 배지다. 원형 사진 자리는 이슈 줄에서 없앴다. BE `imageUrl`이 이슈의 최신 기사 사진이라 26px 원에 넣으면 무슨 사진인지 알 수 없다. 구단 줄은 대체일 때만 나오고 전처럼 크레스트를 단다. 선수(`PLAYER`) 분기와 `PlayerPhoto`는 이제 카드가 선수 랭킹을 그리지 않아 걷어냈다. 줄의 `type` prop도 `"STORY" | "TEAM"`으로 좁혔다.

배지(`TrendDeltaBadge`)는 ▲3, ▼2, -, NEW 넷만 남았다. `_utils/trends.ts`의 `toTrendDelta`에서 `scoreChangeRate`로 흐린 화살표를 만들던 분기와 `muted` 플래그, `SCORE_ARROW_MIN` 상수를 지웠다. 가로줄은 원래 em dash(—)였는데 티켓 표기대로 하이픈으로 바꿨다.

`_constants/trends.ts`에 있던 `TREND_TABS`는 쓸 곳이 없어졌다. 대신 대체 기준(`STORY_TREND_MIN = 3`)과, 컴포넌트 파일 안에 인라인으로 있던 강조 순위와 크레스트 크기를 여기로 옮겼다. 컴포넌트 파일에 상수를 두지 않는다는 규칙에 뒤늦게 맞춘 것이다. 스켈레톤도 탭 두 개와 원형 자리를 빼고 이슈 줄 모양(순위, 제목, 기사 수)으로 바꿨다. 사이드바가 sticky라 로딩 전후 높이가 다르면 카드가 튄다.

## 이슈 상세 페이지와 목록 공용화

`/stories/[storyId]`는 티켓 말대로 인물 프로필(`/figures/[figureId]`)과 같은 구성이다. 서버 컴포넌트에서 `getStory`와 기사 첫 페이지를 `Promise.allSettled`로 같이 받는다. 이슈가 404(`STORY_NOT_FOUND`)나 400(`COMMON_INVALID_PARAM`)이면 `notFound()`를 부른다. `notFound()`는 예외를 던지는 함수라 그 뒤 코드는 실행되지 않고, Next가 같은 세그먼트의 `not-found.tsx`로 화면을 바꿔 끼우면서 HTTP 상태도 404로 내려준다. 기사 첫 페이지만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보내, 목록이 클라에서 다시 받으며 에러와 재시도를 그린다.

머리(`StoryHeader`)에는 "이슈" 라벨, 제목, "기사 N건 · 마지막 기사 N일 전"을 둔다. 제목은 어드민이 고칠 수 있는 문장이라(KAN-521) 자르지 않고 줄을 넘긴다. 머리도 서버 컴포넌트라 상대 시각에 `suppressHydrationWarning`을 달지 않았다. 처음엔 기사 목록 습관대로 달았다가, 급상승 카드에서 뺀 것과 같은 이유로 걷어냈다.

목록을 만들려고 인물 페이지의 `FigureArticlesFeed`와 `useFigureArticles`를 열어 보니, 바꿀 곳이 딱 두 군데였다. 쿼리키(`figureFeed(id)` 대신 `storyFeed(id)`)와 `getArticles`에 넘길 필터(`figureId` 대신 `storyId`). 나머지 130줄(스켈레톤, 에러, 빈 상태, 무한 스크롤 센티널, 커서 400 복구)은 글자 하나 다르지 않다. 복사하면 다음에 커서 복구 같은 곳을 고칠 때 한쪽만 고치게 된다.

그래서 범위를 받게 넓혔다.

- `_types/articles.ts`의 `ArticleScope`: `{ kind: "figure" | "story"; id: string }`
- `_hooks/useFigureArticles.ts`를 `useScopedArticles.ts`로 옮겨 범위를 받게 했다.
- `figures/[figureId]/_components/FigureArticlesFeed.tsx`를 `_components/ScopedArticlesFeed.tsx`로 올렸다. 이제 화면 두 곳이 쓰니 레이어 규칙상 공용 `_components/`가 맞다. 달라지는 빈 상태 문구만 `emptyText`로 받는다.
- 쿼리키를 고르는 `scopedArticlesKey`는 `_utils/articles.ts`에 뒀다. 훅과, 커서가 상해 400이 났을 때 첫 페이지부터 다시 받는 `restartFeedQuery`가 같은 키를 봐야 해서 한 곳에서 만든다. 처음엔 훅 파일에 같이 넣었다가, 훅 파일에는 훅 하나만 둔다는 규칙이 떠올라 뺐다.

`git mv`로 옮겨서 인물 쪽 이력이 이어진다. 모바일 `useFigureArticles`는 건드리지 않았다. 모바일에는 급상승도 이슈 페이지도 없다.

## 검증

로컬 BE에는 급상승 회차 데이터가 없어서, 스크래치에 20줄짜리 node 프록시를 띄웠다. `/api/v1/...` 요청을 `https://dev.plick.co.kr/be/...`로 넘기고, 파일 하나(`mode.txt`)의 값에 따라 응답을 바꾼다.

- `mix`: STORY 응답의 `direction`을 UP, DOWN, NEW, SAME으로 섞는다. dev 실데이터는 네 줄 다 SAME이라 배지 네 종류를 볼 수 없었다.
- `fail`: STORY 요청에 400을 준다. 운영 BE가 STORY를 모르는 상황이다.
- `short`: STORY 응답을 두 건으로 자른다.
- 그리고 `storyId`가 붙은 요청은 `size`를 1로 바꿨다. dev에서 가장 큰 이슈가 기사 세 건이라 기본 페이지 크기 10으로는 다음 페이지가 안 생겨 무한 스크롤을 볼 수 없다.

웹 dev 서버를 `API_BASE_URL=http://localhost:8095`로 띄워 확인했다.

- 홈 사이드바에 이슈 네 줄이 제목, "기사 N", ▲3, ▼2, NEW, - 로 나왔다. 퍼센트는 없다.
- 두 번째 줄을 누르니 `/stories/44`로 가고, 탭 제목이 "히샬리송 바스코 다 가마 이적 | 플릭 PLick", 머리에 "기사 3건 · 마지막 기사 2일 전"이 나왔다. 스크롤하니 `/be/api/v1/articles?...&storyId=44&cursor=...` 요청이 두 번 나가 세 건을 다 받고 "관련 기사를 전부 봤어요"로 끝났다.
- `/stories/99999999`와 `/stories/abc`는 둘 다 HTTP 404에 "이슈를 찾을 수 없어요"다.
- `/figures/1`은 공용화 뒤에도 200으로 관련 기사가 나온다.
- `fail`과 `short` 둘 다 카드가 "실시간 급상승 구단 순위"로 바뀌고 맨유부터 구단 순위가 섰다. 서버 로그에 에러는 없었다(400은 일부러 안 찍는다).

여기서 한 번 헛돌았다. `mode.txt`를 `fail`로 바꾸고 홈을 다시 불렀는데 이슈 목록이 그대로 나왔다. 코드가 안 도는 줄 알았는데, `apiFetch`가 토큰 없는 GET을 `next: { revalidate: 60 }`으로 Next의 서버 데이터 캐시에 넣기 때문이었다. 이 캐시는 페이지 렌더 결과가 아니라 개별 `fetch` 응답을 URL 단위로 저장해 두는 층이라, 60초 안에는 프록시까지 요청이 가지도 않는다. ADR 0149 때도 똑같이 걸렸던 함정이다. `.next/dev/cache/fetch-cache`를 지우고 다시 부르니 바로 구단 순위가 나왔다. 400 응답은 캐시되지 않아 `fail` 뒤로는 문제가 없었고, 반대로 `short`에서 받은 200 응답은 캐시에 남아 다음 모드 확인을 또 가렸다. 모드를 바꿀 때마다 캐시를 지우는 게 맞다.

`pnpm format:check`, `lint`, `check-types`, `pnpm --filter web build`를 통과했다. 빌드 로그의 `fetch failed`는 빌드 머신에 BE가 없는 상태에서 프리렌더하며 늘 찍히는 로그다.

## 남은 것

- 운영 BE에 KAN-522가 릴리스되기 전까지 운영 카드는 구단 순위로 대체돼 보인다. 릴리스 뒤 운영에서 이슈 목록이 뜨는지 한 번 봐야 한다.
- `scoreChangeRate`가 계약에서 빠져도 FE는 이미 안 읽으니 할 일이 없다.
- 이슈 합치기(KAN-521)로 사라진 이슈의 옛 링크가 어떻게 응답하는지(404인지, 합쳐진 이슈로 넘겨주는지)는 아직 모른다. 지금은 404면 not-found 화면이다.
