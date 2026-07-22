# 0030. 모바일 홈 기사 피드 API 연결 (KAN-271)

홈 화면의 "지금 올라온 소식" 리스트를 목데이터에서 실제 BE(`GET /api/v1/articles`)로 갈아끼운 세션이다.
목록 하나 붙이는 단순한 일로 시작했는데, 실제 계약을 확인하고 나니 퍼블리싱 때 추정으로 만들어 둔
도메인 타입과 여러 군데가 어긋나 있었다. 그걸 어디서 어떻게 흡수할지 정하는 데 시간을 제일 많이 썼다.
덤으로 이번이 브라우저에서 BE를 직접 부르는 첫 화면이라 프록시도 처음 깔았다.

## 스웨거를 믿지 않기로 한 게 옳았다

`api-integration` 스킬은 계약 확인을 `be-verify` 서브에이전트에 위임하라고 못박아 두었다. 티켓 설명도
스웨거 설명도 믿지 말라는 규칙이다. ADR 0025, 0026에서 실제로 틀린 전적이 있어 생긴 규칙인데
이번에도 그대로 걸렸다.

스웨거는 이 엔드포인트가 인증이 필요한 것처럼 보이게 해 뒀다. 문서 최상위에 `security: [{ bearerAuth: [] }]`가
전역으로 걸려 있고 이 오퍼레이션에 override가 없어서, 문서만 읽으면 토큰 없이는 못 부르는 API로 읽힌다.
실제로 때려 보니 익명으로 200이 온다. BE 컨트롤러 주석에도 "익명 허용 조회"라고 적혀 있었다.

더 중요한 건 그 반대 방향이었다. 이 API는 토큰을 **안 붙이면** 잘 돌지만 **만료된 토큰을 붙이면** 401
`AUTH_EXPIRED_TOKEN`으로 피드 전체가 죽는다. 기존 `_services/users.ts` 관용대로 "쿠키에 있는 access 토큰을
항상 Bearer로 싣는다"를 생각 없이 따라 했으면, 로그인한 지 오래된 유저가 홈에 들어올 때마다 소식 리스트가
통째로 에러로 떨어졌을 것이다. 어차피 토큰을 붙이든 말든 내려오는 데이터가 같으니(참여 정보가 아직 없다)
이 fetcher는 일부러 토큰을 싣지 않기로 했다. 이 판단 근거를 잊어버리면 나중에 누가 "보호 API 관용에 맞추자"며
헤더를 붙일 수 있어서 `_services/articles.ts` 파일 상단 주석에 이유까지 적어 뒀다.

에러 응답은 스웨거에 아예 없었다(`responses`에 200만 있다). 400도 401도 문서화가 안 돼 있어서
`COMMON_INVALID_PARAM` 같은 코드 문자열은 전부 실제 호출로 확인한 값을 근거로 썼다.

null 표기도 없었다. 스키마상 모든 필드가 nullable 표시 없이 나열돼 있는데, 실제로는 `rumorStage`,
`mainImageUrl`, `detailImageUrl`, `logoUrl`, `sourceUrl`, `reporter` 객체 전체, `reporter.tier`,
`nextCursor`가 전부 null로 내려온다. 스웨거만 보고 타입을 만들었으면 런타임에 깨졌을 자리다.
`rumorStage`는 발행된 1616건 중 829건, 그러니까 절반 넘게 null이었다.

마지막 하나는 이름의 함정이었다. 응답의 `summary`는 이름만 보면 짧은 요약 같은데 BE가 DB의
`summary_detail`(긴 요약)을 매핑해 준다. 짧은 쪽인 `summary_short`는 이 API에 아예 노출되지 않는다.
카드에서 두 줄로 자르고 있어서 당장 문제는 없지만, 나중에 "요약이 왜 이렇게 길지" 하고 헤맬 자리라 타입
주석에 남겼다.

## 커서 페이지네이션이란 게 뭐고 왜 이 계약인가

이 API는 페이지 번호가 없다. `page=2` 같은 걸 못 준다. 대신 응답이 `{ items, nextCursor }` 모양이고,
다음 페이지를 받으려면 방금 받은 `nextCursor` 문자열을 그대로 되돌려줘야 한다.

커서는 서버가 발급한 불투명(opaque) 문자열이다. 불투명하다는 건 클라이언트가 내용을 뜯어보지 말라는
뜻이다. 실제로 열어 보면 마지막 아이템의 `(publishedAt, articleSummaryId)`를 base64url로 인코딩한 것이고
평문은 `2026-07-21T04:27:32.255079Z|6549` 꼴이지만, FE가 이걸 파싱해서 쓰기 시작하면 BE가 커서 포맷을
바꾸는 순간 조용히 깨진다. 받은 걸 그대로 되돌려주는 게 계약이다.

왜 페이지 번호 대신 커서인가. 피드는 위쪽에 새 글이 계속 쌓이는 목록이다. `offset=10`으로 2페이지를 받는
방식이면, 1페이지를 본 사이에 새 기사가 3건 올라왔을 때 offset 10이 가리키는 자리가 밀려서 이미 본 글을
또 보게 된다. 커서는 "이 시각 이 id 다음부터"라는 절대 위치라 뒤에 뭐가 끼어들어도 안 밀린다.

다음 페이지가 있는지는 `nextCursor !== null`로만 판단한다. `hasNext`도 `totalCount`도 없다. 그래서
"전체 N건" 같은 UI나 페이지네이터는 이 API로는 만들 수 없다. 필요해지면 BE에 요청해야 한다.

여기서 한 가지 걱정했던 게 꼬리 빈 페이지다. 남은 건수가 `size`와 정확히 일치하면, 서버가 "일단 커서를
주고 다음에 빈 배열을 주는" 식으로 구현된 경우가 흔하다. 그러면 마지막에 아무것도 없는 페이지가 한 번
더 로딩된다. `be-verify`가 실제로 그 경계를 밟아 확인해 줬는데(`teamId=6`에서 149건을 소진한 뒤 size=30
요청) 서버가 `size+1`건을 읽어 판정하는 구현이라 빈 꼬리 페이지가 생기지 않았다. 전체 1616건을 size=30으로
54페이지 완주했을 때 중복도 누락도 0이었다.

정렬은 `publishedAt DESC, articleSummaryId DESC` 고정이고 정렬 파라미터는 없다. 주의할 점은 실데이터에
같은 `publishedAt`을 공유하는 덩어리가 있다는 것이다(227건이 같은 타임스탬프였다). 그래서 id가 순서대로
안 나온다. 응답 순서를 보고 "id 순이 아니네" 하며 FE에서 재정렬하면 안 되는 자리다.

처음엔 이번 PR에서 커서를 실제로 쓰지 않았다. `getArticles`가 `cursor`를 받고 `nextCursor`를 돌려주는
데까지만 깔아 두고 무한스크롤은 넣지 않았다. 홈 소식 리스트는 최신 10건을 보여주는 자리고 무한스크롤이
정말 필요한 표면은 릴스라고 봤다. 이 판단은 나중에 뒤집혔다. 아래 "무한스크롤을 빼먹었다" 절에 적었다.

## FeedPost를 고칠까 새 타입을 만들까에서 한참 막혔다

퍼블리싱 단계에서 만든 `@plick/domain`의 `FeedPost`는 "BE가 이렇게 줄 것이다"라는 추정이었다.
실제 계약과 맞춰 보니 이렇게 어긋났다.

- `team: TeamCode` 단수인데 BE는 `teams: number[]` 다중이고 빈 배열도 온다.
- `stage: RumorStage` 필수인데 BE는 절반이 null이다. 게다가 값 철자가 다르다. 도메인 타입은 영국식
  `RUMOUR`, BE는 미국식 `RUMOR`다. 한 글자 차이라 눈으로는 잘 안 보인다.
- `reporter: { name, tier: 1 | 2 | 3 }` 필수인데 BE는 `reporter` 객체 자체가 null일 수 있고 `tier`도
  절반이 null이다. 한국어 이름 필드(`koName`)는 있지만 마스터 데이터 12건이 전부 비어 있어 현재는
  무조건 null이다.
- `timeLabel: string`("2분 전")인데 BE는 `publishedAt` ISO 문자열을 준다.
- `contentType`, `body`, `comments`, `debate`는 목록 응답에 아예 없다.
- `tags`는 BE에서 `hashtags`다.
- `id: string`인데 BE는 `articleSummaryId: number`다.

처음엔 당연히 `FeedPost`를 실계약에 맞게 고치려고 했다. ADR 0018에서 두 앱에 복제돼 있던 도메인 타입이
드리프트를 일으켜 `@plick/domain`으로 승격한 전례가 있으니, 단일 출처를 BE 기준으로 바로잡는 게 결이
맞아 보였다.

그런데 손을 대 보니 파급이 컸다. `FeedPost`는 지금 web과 mobile이 함께 쓰는 단일 출처다. `stage`를
nullable로 바꾸면 `STAGE_META[post.stage]`로 배지를 그리는 자리가 전부 타입 에러가 나고, `team`을
없앨 수 있게 만들면 `TEAMS[post.team].colorVar`를 쓰는 자리가 전부 깨진다. 그런데 web은 이번 티켓
스코프가 아니고 아직 목데이터로 돌아간다. 스코프 밖 앱을, 그것도 아직 실데이터를 받지도 않는 앱을
타입 에러 때문에 줄줄이 고치게 되는 상황이었다.

결국 `FeedPost`는 그대로 두고 실제 계약을 담는 타입을 따로 만들었다. `apps/mobile/app/_types/articles.ts`의
`ArticleCard`와 `ArticleFeedPage`다. 그리고 홈 소식 리스트만 이 타입으로 갈아탔다. 핫이슈 캐러셀은
여전히 `FeedPost`와 목데이터를 쓴다.

이건 스킬 §3-3의 "첫 앱은 앱별로 붙이고 두 번째에서 같은 shape면 그때 승격한다"와 §3-4의 "애매하면
승격하지 말고 후보로만 기록한다"를 그대로 따른 것이다. ADR 0011 게이트 C(성숙도)는 두 번째 실사용처가
이미 있을 것을 요구하는데 지금은 모바일 홈 하나뿐이다. 앱별로 두는 건 되돌리기 싸고, 잘못 올려놓고
web까지 끌려들어가는 건 비싸다. ADR 0011 §7 열린 후보에 한 줄 남겨 뒀다.

한 화면 안에 도메인 타입이 두 개 굴러다니는 게 예쁘지는 않다. 다만 이건 진짜 상태를 반영한 것이기도
하다. 캐러셀은 아직 목이고 리스트는 실데이터다. 실제로 다른 데이터라서 다른 타입인 편이 낫다고 봤다.

경계 변환은 전부 `_services/articles.ts`의 `toArticleCard` 하나에 몰아넣었다. 철자 교정도 여기다.

```ts
const STAGE_BY_BE_VALUE: Record<string, RumorStage> = {
  RUMOR: "RUMOUR",
  IN_PROGRESS: "IN_PROGRESS",
  OFFICIAL: "OFFICIAL",
};
```

이렇게 매핑 테이블로 둔 이유가 있다. 단순히 `r.rumorStage as RumorStage`로 캐스팅하면 타입 검사는
통과하지만 `"RUMOR"`가 그대로 흘러들어가서, `STAGE_META["RUMOR"]`가 `undefined`가 되고 배지를 그리는
자리에서 런타임에 터진다. 테이블을 거치면 모르는 값이 들어왔을 때 null로 떨어져서 배지가 안 그려질 뿐이다.
잘못된 배지보다 없는 배지가 낫다.

팀도 비슷하다. BE는 팀 id 배열을 주는데 `_constants/api.ts`의 `TEAM_IDS`가 코드 → id 방향만 있어서
역방향 `TEAM_CODES`를 추가했다. 손으로 또 적지 않고 `TEAM_IDS`에서 파생시켰다. 두 매핑을 각자 적으면
언젠가 갈라진다. `TEAM_IDS` 자체가 BE에 팀 목록 API가 없어서 DB 값을 박아 둔 계약 공백이라(실제로
KAN-264 때 7~12에서 1~6으로 조용히 바뀐 적 있다) 여기서 또 갈라지면 추적이 어렵다.

## TanStack Query를 이번에 도입했다

팀 필터 탭을 어떻게 할지가 갈림길이었다. 지금까지는 서버가 내려준 전체 목록을 클라에서
`posts.filter(p => p.team === filter)`로 걸러냈다. 목데이터 7건일 때는 이게 맞았다.

실데이터가 붙으면 이 방식이 무너진다. 한 페이지가 10건인데 그 10건 안에 아스날 기사가 없으면
"아직 이 팀 소식이 없어요"가 뜬다. 실제로는 아스날 기사가 수백 건 있는데도 그렇다. BE에 `teamId`
파라미터가 있으니 서버에서 거르는 게 맞다.

서버에서 거르려면 탭을 누를 때 요청이 다시 나가야 한다. 여기서 처음으로 브라우저가 BE를 부르게 되고,
그게 `tanstack-query.md` §1의 도입 트리거 중 "같은 데이터를 여러 클라 컴포넌트가 공유·리페치"에 해당한다.
패키지는 ADR 0029에서 이미 설치돼 있었고 provider도 루트 레이아웃에 깔려 있어서 배선만 하면 됐다.

쿼리키는 규약대로 계층 배열로 뒀다.

```ts
export const articleKeys = {
  all: ["articles"] as const,
  feed: (team: Filter) => ["articles", "feed", team] as const,
};
```

탭마다 키가 달라서 각 팀의 목록이 따로 캐시된다. 아스날을 봤다가 전체로 돌아오면 다시 요청하지 않는다.
`staleTime`이 60초로 잡혀 있어서 그 사이에는 캐시가 그대로 쓰인다.

### 서버가 받은 첫 페이지를 클라에 심기

여기서 한 번 헷갈렸던 지점을 정리해 둔다. 서버 컴포넌트가 `await getArticles()`로 받은 데이터는
서버 렌더에만 쓰이고 사라진다. 클라이언트의 React Query 캐시는 처음엔 비어 있다. 그래서 아무것도 안 하면
`useQuery`가 마운트되자마자 같은 첫 페이지를 **또** 부른다. 화면에 데이터가 이미 그려져 있는데 로딩이
한 번 더 도는 이중 페치다.

`data-layer.md`의 캐시 3층 표가 이걸 설명한다. Next 데이터 캐시는 서버에, RQ 캐시는 브라우저 JS 메모리에
있고 둘은 서로의 존재를 모른다. 실행 장소가 어느 캐시를 탈지 가른다. 서버가 받은 게 클라 캐시에 자동으로
들어가는 일은 없다.

다리를 놓는 방법이 두 가지인데, 씨앗을 심을 쿼리가 하나뿐이라 가벼운 쪽인 `initialData`를 썼다.
서버 페이지가 첫 페이지를 `await`해서 props로 내려주고, 훅이 그걸 초기 데이터로 삼는다.

```ts
export function useArticleFeed(team: Filter, initial?: ArticleFeedPage) {
  return useQuery({
    queryKey: articleKeys.feed(team),
    queryFn: () => getArticles({ team }),
    initialData: team === "ALL" ? initial : undefined,
  });
}
```

`team === "ALL"`인지 확인하는 조건이 중요하다. 서버가 받아 온 건 전체 탭 첫 페이지지, 아스날 탭 데이터가
아니다. 조건 없이 심으면 아스날 탭을 눌렀을 때 전체 목록이 아스날 목록인 척 잠깐 보인다.

쿼리가 여러 개로 늘어나면 `HydrationBoundary`로 캐시 전체를 말려 넘기는 정석 방식으로 옮기면 된다.
지금은 하나라 props가 더 단순하다.

### CORS와 `/be` 프록시

브라우저가 `localhost:3001`에서 `localhost:8080`을 직접 부르면 포트가 달라 cross-origin이다. 브라우저는
이런 요청을 그냥 보내지 않고, 서버가 `Access-Control-Allow-Origin` 헤더로 허락했는지 확인한다. BE에
그 설정이 없으면 응답이 와도 브라우저가 JS에 넘겨주지 않고 콘솔에 CORS 에러를 찍는다.

지금까지 이 문제가 없었던 건 모든 fetch가 서버 컴포넌트나 서버 액션에서 돌았기 때문이다. 서버 → 서버
요청에는 CORS가 없다. CORS는 브라우저가 거는 제약이지 HTTP 자체의 제약이 아니다.

BE에 CORS를 열게 하는 대신 `data-layer.md` §1대로 Next `rewrites`로 same-origin 프록시를 깔았다.

```js
async rewrites() {
  const base = process.env.API_BASE_URL ?? "http://localhost:8080";
  return [{ source: "/be/:path*", destination: `${base}/:path*` }];
}
```

브라우저는 자기 오리진의 `/be/api/v1/articles`를 부르고, Next 서버가 그걸 BE로 넘긴다. 브라우저 입장에서는
cross-origin 요청 자체가 없으니 CORS가 발생할 일이 없다. 덤으로 BE 주소가 클라 번들에 안 들어간다.
`API_BASE_URL`에 `NEXT_PUBLIC_`을 안 붙여 둔 이유가 여기서 살아난다.

그래서 `apiFetch`의 base 선택에 분기를 하나 넣었다.

```ts
function baseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_BASE_URL ?? "http://localhost:8080";
  }
  return "/be";
}
```

`typeof window === "undefined"`가 서버 판정이다. 같은 fetcher를 서버 컴포넌트와 클라 훅이 함께 쓰는데
호출부는 어느 쪽에서 도는지 신경 쓸 필요가 없다.

여기서 `_services/articles.ts`를 서버 액션(`"use server"`)으로 만들지 않은 이유도 분명해진다. 기존
`_services/users.ts`는 전부 서버 액션인데, 서버 액션은 이름 그대로 항상 서버에서 실행되고 클라에서
부르면 RPC 왕복이 한 번 더 생긴다. 이 fetcher는 서버 렌더에서도 브라우저에서도 그 자리에서 직접 돌아야
해서 평범한 모듈로 뒀다.

## 서버 fetch 실패를 페이지 전체 에러로 만들지 않기

`app/error.tsx`가 이미 있어서 서버 컴포넌트에서 예외가 나면 페이지 전체가 에러 화면으로 바뀐다.
그런데 BE가 잠깐 죽었다고 홈 전체가 사라지는 건 과했다. 핫이슈 캐러셀은 목데이터라 멀쩡히 그릴 수 있고,
탭바도 그대로 있어야 다른 화면으로 나갈 수 있다.

그래서 페이지에서 서버 fetch를 감싸서 실패를 흡수했다.

```tsx
let initial: ArticleFeedPage | undefined;
try {
  initial = await getArticles();
} catch (e) {
  console.error("[home] 기사 피드 초기 로드 실패:", e);
}
```

`initial`이 없으면 `useQuery`의 `initialData`가 `undefined`가 되고, 훅이 클라에서 알아서 다시 시도한다.
그것도 실패하면 리스트 자리에만 "소식을 불러오지 못했어요"와 재시도 버튼이 뜬다. 재시도는 `refetch()`고
`isFetching` 동안 버튼을 비활성화해서 연타를 막았다. 라우트 `error.tsx`는 예상 못 한 렌더 에러의 마지막
그물로 그대로 둔다.

로딩은 `isPending`으로 잡아 스켈레톤 네 줄을 보여준다. `bg-elevate` 토큰을 쓰고 실제 줄과 같은 높이·간격을
줘서 데이터가 도착할 때 리스트가 튀지 않게 했다. 서버가 첫 페이지를 심어 주므로 전체 탭 첫 진입에는
스켈레톤이 아예 안 보이고, 팀 탭을 처음 누를 때만 보인다.

빈 상태는 `data.items.length === 0`으로만 판단한다. `teamId` 필터 결과가 0건이어도 200이 오지 에러가
아니라서 기존 "아직 이 팀 소식이 없어요" 문구를 그대로 쓴다.

## 상대 시각과 하이드레이션

BE는 `publishedAt`을 ISO로 주고 화면은 "2분 전"으로 보여줘야 해서 `_utils/time.ts`에 변환을 만들었다.

여기 함정이 하나 있다. BE 값에 이미 KST 오프셋(`+09:00`)이 박혀 있다. `2026-07-21T13:27:32.255079+09:00`
같은 모양이다. 이걸 보고 "한국 시간으로 바꿔야지" 하며 9시간을 더하면 9시간이 밀린다. `Date`가 오프셋을
알아서 해석하니 그냥 차이만 계산하면 된다. 소수점 자릿수도 `.255079`, `.884`, `.53`처럼 들쭉날쭉해서
문자열을 고정 길이로 자르는 파싱은 못 쓴다. `new Date()`는 다 정상 처리한다.

또 하나는 하이드레이션이다. 하이드레이션은 서버가 그려 보낸 HTML에 클라이언트 React가 이벤트 핸들러를
붙이며 "내가 그렸어도 같은 결과인지" 대조하는 과정이다. 다르면 경고를 낸다. 그런데 상대 시각은 계산하는
순간에 따라 값이 달라진다. 서버가 "59분 전"을 그린 직후 클라가 "1시간 전"을 계산하면 불일치가 난다.

데이터가 틀린 게 아니라 시간이 흐른 것뿐이라 해당 노드에만 `suppressHydrationWarning`을 달았다.
이 속성은 그 요소의 텍스트 불일치만 눈감아 주고 다른 검사에는 영향을 주지 않는다. 시각을 서버에서
미리 문자열로 만들어 내려보내는 방법도 있는데, 그러면 탭을 오래 열어 둬도 "2분 전"이 영영 안 바뀐다.

## 자잘하게 막힌 것들

`next.config.js`에 `process.env`를 쓰자 lint가 `'process' is not defined`로 막았다. 공용 eslint 설정이
`globals.serviceworker`만 주고 있어서 Node 전역이 없었다. TS 파일은 typescript-eslint가 `no-undef`를
꺼서 안 걸리는데 설정 파일만 걸린 것이다. `packages/eslint-config/next.js`에 `*.config.js`용 Node 전역
블록을 추가했다. web도 나중에 같은 프록시를 깔 테니 공용 설정에 두는 게 맞다.

`next.config.mjs`를 새로 만들었다가 이미 `next.config.js`가 있는 걸 뒤늦게 알고 지웠다. 둘 다 있으면
Next가 어느 쪽을 읽는지 헷갈리는 상태가 된다.

`.env.local`이 없어서 처음엔 서버 fetch가 기본값으로만 돌았다. `.env.example`을 복사해 만들었다.
이 파일은 git에 안 올라가니 개발자마다 각자 만들어야 한다.

## 이번에 안 한 것들

핫이슈 캐러셀은 목데이터 그대로 뒀다. BE에 인기나 조회수 개념이 없고 정렬 파라미터도 없어서
(`publishedAt DESC` 고정) 무엇을 핫으로 볼지 근거가 되는 값이 아예 없다. 최신 3건을 핫이슈라고
부르는 건 거짓말이라 조회수 API가 붙을 때 같이 연결하기로 했다.

조회수·댓글수·좋아요 수는 그대로 노출한다. BE의 `NoopArticleEngagementProvider`가 자리표시 구현이라
인증 여부와 무관하게 항상 0/false가 온다. 참여 기능이 붙기 전까지 모든 카드에 "조회 0 · 댓글 0"이 찍힌다.
숨기는 안도 있었지만 레이아웃을 지금 형태로 유지하기로 했다. 좋아요를 낙관적으로 렌더링하면 새로고침마다
0으로 되돌아가니, 참여 기능을 붙일 때는 이 값을 신뢰하면 안 된다.

이미지도 아직 없다. `mainImageUrl`, `detailImageUrl`, `logoUrl`이 실데이터 1616건 전부 null이다.
`MediaThumb` placeholder가 그대로 자리를 지킨다. 팀 태그가 없는 기사는 팀 컬러가 없어서 강조색으로
폴백하게 했다.

## 남아 있는 문제: 기사 상세가 404다

리스트가 이제 BE id(`/articles/7290`)로 링크하는데 `/articles/[postId]` 페이지는 아직 목데이터의
`getPost()`를 쓴다. 목에는 `h1`, `n2` 같은 id밖에 없으니 못 찾고 `notFound()`로 떨어진다.
실제로 확인했고 404가 맞다.

이걸 이번 PR에 같이 넣을지 고민했는데, 상세는 별도 엔드포인트(`GET /api/v1/articles/{id}`)라
"엔드포인트 하나가 작업 하나"라는 원칙에 따라 다음 티켓으로 넘기기로 했다. develop이 그 사이 잠깐
깨진 상태로 있게 되는 건 알고 있는 대가다. 상세 API 연결을 바로 이어서 한다.

## 검증

계약과 DB 대조는 `be-verify`가 다 했다. 전체 1616건 완주로 중복·누락 0을 확인했고, 응답 건수가
`article_summaries where status='PUBLISHED' and published_at is not null`과 일치하는 것,
`summary`가 `summary_detail`인 것, `teams`가 `team_tags` 조인 결과인 것까지 DB로 확인했다.
읽기 전용이라 테스트 유저는 만들지 않았고 쓰기 쿼리는 0건이다.

화면 쪽은 dev 서버를 3011 포트에 띄워서(3001은 이미 다른 프로세스가 쓰고 있었다) 확인했다.
서버 렌더 HTML에 실제 기사 제목과 BE id 링크, 팀 이름, "1일 전" 상대 시각이 정상적으로 박히는 것,
`/be` 프록시로 `teamId=3`이 200을 주고 `size=31`이 400을 주는 것까지 봤다. 모바일 프로덕션 빌드와
`check-types`, `lint`, `format:check`도 통과했다.

다만 **브라우저에서 탭을 실제로 눌러 보는 상호작용 검증은 못 했다.** 이 세션에 브라우저 도구가 없어서
HTTP 레벨까지만 확인했다. 팀 탭 전환 시 재요청, 스켈레톤 노출, 캐시된 탭 재방문, 에러 상태와 재시도
버튼은 사람이 한 번 밟아 봐야 한다.

## 무한스크롤을 빼먹었다

PR을 올리고 나서 "맨 밑까지 다 보면 그 뒤로 더 받아오는 건 왜 구현 안 했냐"는 지적을 받았다. 맞는 지적이었다.

내 논리는 "엔드포인트 하나가 작업 하나니까 PR을 작게" 였는데, 다시 보니 근거가 약했다. 목데이터일 때는
소식이 4건이 전부라 리스트가 끝나는 게 자연스러웠지만, 실데이터는 발행 건만 1616건이다. 10건에서 뚝
끊기고 더 볼 방법이 없는 리스트는 작은 PR이 아니라 그냥 기능이 빠진 화면이다. 게다가 이번 계약 확인의
핵심이 커서 페이지네이션이었는데 그걸 fetcher까지만 깔고 화면에서 안 쓴 건 앞뒤가 안 맞았다.

더 문제였던 건 이걸 물어보지 않고 혼자 잘랐다는 점이다. 스코프를 줄이는 판단은 내가 임의로 할 게 아니라
확인하고 갔어야 했다.

### useQuery에서 useInfiniteQuery로

바꾸는 것 자체는 크지 않았다. `useInfiniteQuery`는 페이지들을 배열로 쌓아 두고 다음 페이지를 무엇으로
부를지만 물어본다.

```ts
useInfiniteQuery({
  queryKey: articleKeys.feed(team),
  queryFn: ({ pageParam }) => getArticles({ team, cursor: pageParam }),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  initialData:
    team === "ALL" && initial
      ? { pages: [initial], pageParams: [null] }
      : undefined,
});
```

`getNextPageParam`이 이 API의 계약을 그대로 옮긴 자리다. BE에 `hasNext`가 없으니 `nextCursor`가 null인지로만
판단하는데, RQ는 "다음 페이지 없음"을 undefined로 표현한다. null과 undefined를 구분하기 때문에 `?? undefined`로
바꿔줘야 한다. 이걸 빼고 null을 그대로 돌려주면 RQ는 "다음 페이지 파라미터가 null이다"로 읽어서
`hasNextPage`가 계속 true로 남고, 커서 없이 첫 페이지를 무한히 다시 받는다.

`initialData`도 모양이 바뀐다. 단일 쿼리일 땐 페이지 하나를 그대로 넣었지만 무한 쿼리는 페이지 배열과
그 페이지들을 부를 때 쓴 파라미터 배열을 함께 요구한다. `pageParams: [null]`이 "첫 페이지는 커서 없이
받은 것"이라는 뜻이고, 이게 있어야 RQ가 두 번째 페이지부터 이어붙일 수 있다.

데이터는 `data.pages.flatMap((page) => page.items)`로 펴서 쓴다.

### 스크롤 감지를 어떻게 할까

스크롤 이벤트를 직접 듣는 방법이 먼저 떠올랐는데 안 좋다. 스크롤 한 번에 핸들러가 수십 번 불리고,
그때마다 요소 위치를 재는 계산이 레이아웃을 강제로 다시 계산하게 만든다. 그래서 `IntersectionObserver`를
썼다. 리스트 맨 끝에 높이 1px짜리 감시 요소를 두고, 브라우저가 그게 보이기 시작할 때만 알려주게 한다.
관찰자는 브라우저 내부에서 비동기로 판정해서 메인 스레드를 잡아먹지 않는다.

여기서 홈 구조 때문에 한 번 걸렸다. 홈은 window가 스크롤되는 게 아니라 `ScrollArea`(`overflow-y-auto`인
`<main>`) 안에서 스크롤된다. 관찰자에 root를 안 주면 뷰포트 기준으로 보는데, 그러면 컨테이너 안쪽
스크롤을 못 잡는 거 아닌가 싶었다.

확인해 보니 그렇지 않았다. `IntersectionObserver`는 대상과 root 사이에 낀 조상들이 잘라내는 영역까지
함께 계산한다. 감시 요소가 `ScrollArea` 밖으로 밀려나 있으면 조상이 잘라내므로 뷰포트와도 교차하지 않는
것으로 잡히고, 스크롤해서 컨테이너 안으로 들어오면 그때 교차한다. `ScrollArea` 자체가 화면에 보이는
영역이라 결과적으로 원하는 대로 동작한다. ScrollArea에 ref를 뚫어 root로 넘기는 방법도 있었지만
공용 컴포넌트를 건드려야 해서, 되는 걸 확인하고 그냥 뒀다.

`rootMargin: "200px"`을 줘서 감시 요소가 실제로 보이기 200px 전에 미리 당긴다. 사용자가 끝에 닿기 전에
다음 페이지가 도착해 있으면 끊기는 느낌이 없다.

관찰자를 켜고 끄는 조건도 신경 썼다. `hasNextPage && !isFetchingNextPage && !isFetchNextPageError`일 때만
관찰한다. 받는 중에도 켜 두면 같은 페이지를 여러 번 요청한다. 반대로 다 받은 뒤 다시 켜질 때 감시 요소가
여전히 화면에 있으면 관찰자가 즉시 한 번 더 부르는데, 이건 의도한 동작이다. 화면이 커서 한 페이지로는
스크롤이 아예 안 생기는 경우에 다음 페이지를 이어서 채워준다.

콜백은 ref에 담아 뒀다. 안 그러면 렌더마다 콜백 함수 정체성이 바뀌어 관찰자를 계속 새로 만들게 된다.

### 상한 커서를 만나면 되돌아간다

`be-verify` 리포트가 짚은 것 중에 이게 있었다. 커서가 위조되거나 상하면 400이 오는데, 잘못된 파라미터와
똑같은 `COMMON_INVALID_PARAM` 코드로 뭉쳐서 온다. 둘을 구분할 방법이 없다.

그래서 두 가지를 했다. 먼저 RQ의 기본 재시도를 4xx에서는 끄게 했다. 기본값은 실패를 세 번까지 다시
보내는데, 잘못된 커서는 몇 번을 보내도 같은 400이라 시간만 버린다. 서버 오류나 네트워크 순단만 다시
시도하게 조건을 달았다.

그리고 다음 페이지에서 400이 나면 재시도 버튼이 같은 커서로 또 부르지 않고 `resetQueries`로 그 탭을
통째로 비워 첫 페이지부터 다시 받게 했다. 상한 커서를 붙잡고 있어봐야 계속 400이기 때문이다.

리스트 중간에서 에러가 났을 때 이미 받아 둔 항목이 사라지지 않게, 전체 에러 화면은 `articles.length === 0`일
때만 띄운다. 이어받기 실패는 리스트 아래에 작은 에러와 재시도 버튼으로만 붙는다. 다음 페이지를 받는
동안에는 리스트 끝에 스켈레톤 한 줄을 붙여 뭔가 오고 있다는 걸 보여준다.

### 서버가 준 첫 페이지와 클라 캐시는 어떻게 맞춰지나

리뷰에서 "전체 탭일 때 서버에만 있는 초기 데이터를 이후 무한스크롤과 어떻게 동기화했냐"는 질문을 받았다.
답부터 말하면 동기화라는 게 없다. 서버 데이터는 캐시에 한 번 심는 씨앗이고 그 뒤로 서버는 관여하지 않는다.
헷갈리기 쉬운 대목이라 `@tanstack/query-core@5.101.4` 소스를 열어 확인한 내용을 정리해 둔다.

서버 컴포넌트의 `await getArticles()` 결과는 어떤 캐시에도 안 들어간다. 그냥 평범한 JS 값이고,
RSC 페이로드에 실려 브라우저로 내려간 뒤 `initial` prop이 된다.

그걸 `initialData`로 넘기면 RQ가 `["articles","feed","ALL"]` 캐시 엔트리를 **만들면서** 그 값을 자기
데이터로 삼는다. 여기가 `placeholderData`와 갈리는 지점이다. placeholder는 캐시에 안 써지고 화면에만
잠깐 보이는 임시값이지만, initialData는 진짜 캐시 데이터가 된다. 소스에서 `getDefaultState()`가
initialData를 읽어 `dataUpdatedAt: Date.now()`까지 찍어 상태로 만든다. 그래서 `staleTime`(전역 60초)이
그 시점부터 카운트되고 마운트 직후 재요청이 안 나간다. 이중 페치를 막는 실제 메커니즘이 이거다.

무한스크롤은 별도 캐시가 아니라 **같은 엔트리에 쌓인다.** `fetchNextPage()`는 `direction: "forward"`로
들어가 `oldPages`의 마지막 페이지에 `getNextPageParam`을 돌려 커서를 얻고, 한 페이지만 받아
`addTo(data.pages, page)`로 뒤에 붙인다.

```
pages:      [서버가 준 1페이지, 2페이지, 3페이지, ...]
pageParams: [null,              cursor1,  cursor2, ...]
```

`pages[0]`은 계속 서버가 준 그 데이터다. 서버 캐시가 따로 살아 있다가 맞춰지는 게 아니라 처음 한 번
부어넣고 끝이다.

그래서 두 가지 동작이 나온다. 하드 리로드는 완전히 일치한다. RQ 캐시는 브라우저 메모리라 새로고침하면
비어 있고, SSR HTML과 `initialData`가 같은 값이라 불일치가 날 여지가 없다.

반면 소프트 내비게이션에서는 서버 fetch가 버려진다. 릴스 갔다가 홈으로 돌아오면 서버 컴포넌트가 다시
돌면서 `getArticles()`를 새로 부르는데, RQ는 엔트리에 이미 데이터가 있으면 initialData를 무시한다.
소스에 `if (this.state && this.state.data === void 0)` 가드가 있어서 data가 있는 한 덮어쓰지 않는다.
사실 이건 원하는 동작이다. 8페이지까지 스크롤했다가 돌아왔는데 1페이지로 리셋되면 곤란하다.
대신 서버가 한 번 헛일을 한다.

### 포커스 재요청을 끈 이유

소스를 보다가 걸린 게 하나 더 있었다. 방향 없는 `refetch`는 쌓인 페이지를 **전부 순차로** 다시 받는다.

```js
const remainingPages = pages ?? oldPages.length;
do {
  const param =
    currentPage === 0
      ? (oldPageParams[0] ?? options.initialPageParam)
      : getNextPageParam(options, result);
  result = await fetchPage(result, param);
  currentPage++;
} while (currentPage < remainingPages);
```

커서 체인이라 병렬로도 못 받는다. 앞 페이지 응답이 와야 다음 커서를 알기 때문이다. RQ 기본값이
`refetchOnWindowFocus: true`고 staleTime 60초가 지났으면 stale이라 재요청이 걸리니, 8페이지까지 스크롤한
상태에서 다른 탭 갔다 오면 요청 8개가 줄줄이 나간다.

그래서 이 쿼리만 `refetchOnWindowFocus: false`로 껐다. 피드가 창을 다시 볼 때마다 최신으로 맞춰져야 할
성격도 아니다. `refetchOnMount`는 기본값(true)으로 뒀는데, 홈을 떠났다 60초 뒤에 돌아오면 같은 모양으로
페이지 수만큼 요청이 나간다. 실사용에서 홈 소식을 깊게 스크롤하는 빈도를 보고 판단하려고 일단 남겨 뒀다.

### 검증

프록시를 통해 1페이지를 받고 그 `nextCursor`로 2페이지를 받아 봤다. id가 겹치지 않았고
(`[7290,6635,...,6549]` 다음에 `[6324,6311,...,5995]`), 결과가 없는 조건에서는 `{ items: [], nextCursor: null }`로
제대로 끝났으며, 위조 커서는 400을 줬다. 리커버리 경로가 실제로 존재하는 걸 확인했다.

여전히 **브라우저에서 스크롤을 내려 관찰자가 실제로 발동하는지는 못 봤다.** 이 세션에 브라우저 도구가
없어서 HTTP 레벨까지만 확인했다. 이 부분은 사람이 밟아 봐야 한다.

## 참고

- 계약 확인 절차: `api-integration` 스킬 §2, `be-verify` 서브에이전트([ADR 0028](0028-be-verify-subagent.md))
- 데이터 레이어 패턴: `api-integration/data-layer.md`
- RQ 도입 트리거와 하이드레이션: `api-integration/tanstack-query.md`
- 공용화 게이트: [ADR 0011](0011-shared-code-boundary.md) (§7에 이번 후보 기록)
- 레이어 폴더 배치: [ADR 0029](0029-layered-architecture-restructure.md)
