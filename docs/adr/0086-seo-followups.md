# 0086. SEO 후속 작업 일괄 (KAN-380)

2026-08-10. [SEO 전략 계획](../seo-strategy.md)(KAN-345)에서 아직 안 한 것들을 한 티켓으로 묶어
처리하는 세션이다. Step 0~1의 코드 몫(ADR 0070, 0071)과 Step 2의 팀 허브·JSON-LD·동적 OG
(ADR 0072, 0073)까지는 이미 들어가 있고, 남아 있던 건 이렇다.

- Step 2-6 캐시 전략
- Step 2-5 시맨틱 마크업 감사
- Step 3-5의 측정 수단(GA4)
- manifest
- 배포 후 운영 작업: Search Console·네이버 등록(1-6), 실배포 검증(1-7), Core Web Vitals(3-3),
  thin content BE 협업(3-2), 백링크(3-4)

`/reels/[postId]`(2-1)과 서비스 소개 페이지(3-1)는 이번 범위에서 뺐다. 둘 다 화면이 새로
생기는 작업이라 SEO 후속 정리와 성격이 다르고, 별도 티켓으로 잡는 게 맞다고 봤다.

그리고 전략 문서에는 없던 구멍이 하나 새로 보였다. 그것부터 막았다.

## 1. dev 도메인이 색인되고 있었다

전략 문서(2026-08-03)를 쓸 때는 도메인이 `plick.co.kr`과 `m.plick.co.kr` 두 개였다. 그 뒤
KAN-377에서 개발/실서비스 환경을 분리하면서 `dev.plick.co.kr`과 `dev-m.plick.co.kr`이 생겼고
(ADR 0083, 0084), develop 브랜치가 푸시될 때마다 여기로 배포된다.

문제는 robots와 메타데이터가 환경을 구분하지 않는다는 거였다. `app/robots.ts`는 환경과 무관하게
`Allow: /`에 사이트맵 위치까지 적어 내려주고 있었고, 그 사이트맵은 dev 빌드에 굳은
`NEXT_PUBLIC_SITE_URL`을 그대로 써서 dev 도메인 기준 URL 전건을 나열했다. 즉 dev 사이트가
prod와 완전히 같은 콘텐츠를 크롤러에게 "여기 다 있습니다" 하고 안내하는 상태였다.

이게 왜 나쁘냐면, 구글 입장에서 `plick.co.kr/articles/8032`와 `dev.plick.co.kr/articles/8032`는
같은 내용의 서로 다른 URL이다. 중복 콘텐츠로 판단되면 둘 중 하나를 대표로 고르고 나머지를
접는데, 이 선택이 항상 우리가 원하는 쪽으로 가지 않는다. 최악의 경우 dev 도메인이 대표로 잡혀
검색 결과에 개발 서버 주소가 노출된다. ADR 0070에서 canonical을 apex 한쪽으로 모으려고 공들인
걸 dev가 옆에서 새는 구조였다.

### robots.txt로 막을 것인가, noindex로 막을 것인가

여기서 한 번 방향을 틀었다. 처음엔 dev robots.txt를 `Disallow: /` 한 줄로 바꿨다. 제일
직관적이고 흔한 방법이다. 그런데 코드를 커밋하기 전에 다시 생각해 보니, 이 둘은 같은 일을
하는 장치가 아니다.

- `Disallow: /`는 크롤 금지다. "이 URL을 가져가서 읽지 마라"까지고, 색인 금지가 아니다.
  구글은 크롤하지 않은 URL도 외부 링크만 있으면 URL 자체를 색인할 수 있다(제목만 있고 설명
  자리에 "이 페이지에 대한 정보를 제공할 수 없습니다"가 뜨는 그 결과다).
- `noindex` 메타 태그는 색인 금지다. 대신 크롤러가 페이지를 실제로 가져와서 HTML을 읽어야
  전달된다.

둘을 같이 걸면 어떻게 되냐면, robots.txt가 먼저 평가되어 크롤이 막히고, 그래서 크롤러는 페이지
안의 noindex를 영영 읽지 못한다. 색인을 지우고 싶을 때 지울 수단이 없어진다. 안전장치를 두 개
걸었다고 생각했는데 실제로는 강한 쪽 하나가 약한 쪽을 무력화하는 조합이다.

dev URL이 밖으로 샐 경로가 없느냐 하면 그것도 아니다. 배포 워크플로 로그, PR 본문, 팀 메신저
어디든 주소가 적힐 수 있다. 그래서 크롤은 열어 두고 색인만 확실히 막는 쪽으로 갔다.

- dev robots.txt: 기존 규칙 그대로 두되 `Sitemap:` 줄만 뺀다. 크롤러에게 URL 전건 목록을 손에
  쥐여 줄 이유는 없다. 발견은 알아서 하되 도와주지는 않는 정도.
- dev 전 페이지: `<meta name="robots" content="noindex, nofollow">`. 발견되더라도 색인은 안 된다.

크롤러 트래픽이 dev로 조금 들어오게 되는데, ASG EC2 한 대 기준으로 무시할 수준이라 트레이드오프를
받아들였다.

### 판정을 어디서 하나

환경 판정용 플래그를 새로 만들지 않고 이미 있는 것에서 유도했다.

```ts
/** 실서비스 모바일 도메인. 색인 허용 판정의 기준값이라 리터럴로 둔다. */
const PROD_SITE_URL = "https://m.plick.co.kr";

export const IS_PRODUCTION_SITE = SITE_URL === PROD_SITE_URL;
```

`SITE_URL`은 `NEXT_PUBLIC_SITE_URL`에서 오고, 이 값은 deploy.yml의 빌드 스텝이 브랜치에 따라
넣어 준다(main이면 실도메인, 그 외면 dev 도메인). `NEXT_PUBLIC_` 접두사가 붙은 환경변수는
런타임에 읽히는 게 아니라 빌드 시점에 번들 안으로 문자열 리터럴로 치환되어 굳는다(ADR 0070에
적어 둔 `API_BASE_URL`과 같은 제약이다). 그래서 위 비교도 빌드 시점에 결과가 확정된다. 환경변수를
하나 더 늘려서 오설정 가능성을 만드는 것보다, 이미 배포에서 관리되는 값 하나에서 파생시키는 쪽이
어긋날 여지가 적다고 봤다. 로컬 개발(`http://localhost:3001`)도 자연스럽게 non-prod로 떨어진다.

robots는 이렇게 갈라진다.

```ts
const rules = {
  userAgent: "*",
  allow: "/",
  disallow: ["/api/", "/oauth/", "/me/", "/onboarding/"],
};

if (!IS_PRODUCTION_SITE) {
  return { rules };
}

return { rules, sitemap: `${SITE_URL}/sitemap.xml` };
```

noindex는 루트 레이아웃 메타데이터 한 줄이다.

```ts
robots: IS_PRODUCTION_SITE ? undefined : { index: false, follow: false },
```

Next의 Metadata API는 세그먼트별로 병합되면서 아래쪽이 이긴다. 하위 페이지들이 robots 키를
따로 선언한 곳이 한 군데도 없어서, 루트의 이 한 줄이 전 라우트에 그대로 상속된다. prod에서는
`undefined`라 메타 태그 자체가 안 나가고, 태그가 없는 건 크롤러에게 기본값(색인 허용)이다.
`noindex` 대신 `undefined`를 넣는 게 중요한데, `{ index: true }`를 명시하면 `index, follow`
태그가 실제로 출력된다. 틀린 건 아니지만 없어도 되는 태그라 안 내보내는 쪽을 골랐다.

사이트맵 라우트 자체(`/sitemap.xml`)는 dev에서도 그대로 응답한다. robots가 안내하지 않을 뿐
직접 열면 나온다. 여기까지 막을까 했는데, 그러면 로컬에서 사이트맵이 제대로 만들어지는지
확인할 수단이 사라진다. 사이트맵에 실린 페이지들이 전부 noindex라 색인 위험은 없으므로
그대로 뒀다.

### 검증

로컬 dev 서버(mobile 3001, web 3000)로 확인했다. 로컬은 non-prod 분기를 타므로 dev 배포와
같은 결과가 나온다.

- `/robots.txt` 양쪽 모두 규칙은 그대로고 `Sitemap:` 줄이 사라졌다.
- `/signup`의 `<meta name="robots">`가 두 앱 모두 `noindex, nofollow`. canonical은
  `http://localhost:3000/signup`으로 여전히 데스크톱을 가리킨다(ADR 0070 A안 유지).
- format:check, lint, check-types 통과.

prod 분기는 조건식 한 줄 위쪽이고 기존 동작 그대로라 별도로 빌드해 보지는 않았다. 배포 후
`https://plick.co.kr/robots.txt`에 `Sitemap:` 줄이 있고 페이지에 robots 메타가 없는 걸
확인하는 게 아래 운영 작업(1-7)에 포함된다.

## 2. 캐시 전략 (Step 2-6)

전략 문서에 "기사 상세에 `revalidate` 도입 검토(루트 레이아웃의 쿠키 읽기와의 충돌 정리 필요)"로
적혀 있던 항목이다. 막상 손대려니 그 "충돌 정리"가 생각보다 큰 이야기였다.

### 왜 페이지를 정적으로 못 만드나

루트 레이아웃이 서버에서 `cookies()`를 읽는다(`isLoggedIn`, `getMyProfile`). Next에서 요청
쿠키를 읽는 순간 그 렌더는 동적으로 확정된다 — 빌드 시점에 결과를 미리 만들어 둘 수가 없다.
사람마다 다른 값을 참조하니 당연한 결론이다. 이게 루트 레이아웃에 있으니 그 아래 전 라우트가
동적이다. 기사 상세에 `export const revalidate = 300`을 적어도 아무 일도 일어나지 않는다.

정적으로 만들려면 셋 중 하나다.

1. 루트 레이아웃에서 쿠키 읽기를 걷어내고 로그인 상태를 클라에서 받아 온다. 첫 페인트에
   로그인 UI가 비로그인 상태로 잠깐 그려지는 깜빡임이 생긴다.
2. Next 16의 `cacheComponents`(PPR)로 정적 껍데기와 동적 조각을 나눈다. 쿠키를 읽는 부분만
   Suspense 경계 안으로 밀어 넣는 작업인데, 인증 시딩·프록시와 얽혀 회귀 범위가 넓다.
3. 그대로 둔다.

SEO에서 얻으려는 건 크롤러 응답 속도인데, 그 시간의 대부분은 페이지 함수 실행이 아니라 BE
왕복이다. 그래서 3번을 고르고, 대신 **fetch를 캐시**하는 쪽으로 방향을 틀었다. 인증 구조를
건드리지 않으면서 크롤러 체감의 대부분을 가져오는 선택이다.

### Next 15부터 fetch 기본값이 no-store다

여기서 먼저 확인한 사실. Next 14까지는 서버 컴포넌트의 `fetch`가 기본으로 캐시됐지만
(`force-cache`), 15부터 기본이 `no-store`로 바뀌었다. 명시하지 않으면 캐시가 아예 안 산다는
뜻이라, 우리 코드에서 익명 조회조차 매 요청 BE를 돌고 있었다. 크롤러가 기사 100개를 훑으면
BE 요청 100번이 그대로 나간다.

### 캐시에 넣어도 되는 요청과 안 되는 요청

Next의 데이터 캐시는 URL 단위로 전 유저가 공유한다. 그래서 `likedByMe`처럼 사람마다 다른 값이
섞인 응답을 넣으면 남의 상태가 그대로 보인다. KAN-308에서 이미 "토큰을 실은 호출은 `no-store`"로
못박아 뒀는데, 이번에 그 반대편을 채웠다. 토큰 없는 GET은 유저 무관이므로 캐시에 넣는다.

```ts
const authorized = headers.has("Authorization");
const isGet = (init?.method ?? "GET").toUpperCase() === "GET";
const cacheConfigured = init?.cache !== undefined || init?.next !== undefined;
const cacheable = !authorized && isGet && !cacheConfigured;
```

세 조건을 다 건 이유가 각각 있다.

- `authorized`: 위에 쓴 개인화 응답 문제.
- `isGet`: 로그인·좋아요·조회수 기록 같은 POST는 캐시 대상이 아니다. Next도 자체적으로 GET/HEAD가
  아니면 캐시하지 않지만, 우리 의도를 코드에 남겨 둔다.
- `cacheConfigured`: 호출부가 `cache`나 `next`를 직접 넘겼으면 그 뜻을 존중한다. 겹쳐 넘기면
  Next가 "cache와 revalidate를 둘 다 지정했다"는 충돌로 보고 양쪽을 통째로 무시해 버려서,
  의도한 no-store가 조용히 풀리는 사고가 난다.

TTL은 60초로 잡았다. 이적 루머 피드에서 1분 지연은 체감이 없고, 크롤러가 기사들을 연달아 훑을 때
같은 목록 호출이 반복되는 몫을 걷어내기에는 충분하다.

`@plick/core`는 Next에 의존하지 않는 순수 패키지라 `RequestInit`에 Next가 얹는 `next` 속성의
전역 타입 보강을 못 받는다. 그래서 `NextRequestInit`을 그 파일 안에서 좁게 선언했다. 브라우저
fetch에서는 모르는 속성이라 그냥 무시된다.

### Next 내부를 열어 보고 알게 된 두 가지

사이트맵이 `force-dynamic`이라, 이 세그먼트 설정이 fetch 옵션까지 덮어쓰는지가 걸렸다. 문서만
읽고 추측하기 싫어서 `next/dist/server/lib/patch-fetch.js`를 직접 열었다.

```js
const noFetchConfigAndForceDynamic =
  !pageFetchCacheMode &&
  !currentFetchCacheConfig &&
  !currentFetchRevalidate &&
  workStore.forceDynamic;
```

`force-dynamic`이 fetch를 no-store로 낮추는 건 **그 fetch에 아무 캐시 옵션도 없을 때뿐**이다.
`apiFetch`가 revalidate를 명시하니 사이트맵 안의 기사 목록 호출도 캐시를 탄다. 렌더는 요청마다
돌면서 데이터만 재사용하는, 이 라우트에 딱 맞는 조합이라 `force-dynamic`을 그대로 뒀다
(ISR로 바꾸면 CI 빌드 때 BE를 못 불러 기사 없는 사이트맵이 굳는 문제가 생긴다).

그 몇 줄 아래에서 더 중요한 걸 봤다.

```js
let autoNoCache = Boolean(
  (hasUnCacheableHeader || isUnCacheableMethod) &&
  revalidateStore?.revalidate === 0,
);
```

`hasUnCacheableHeader`는 `authorization`이나 `cookie` 헤더가 있는 요청을 가리킨다. 그런데 이
자동 차단은 뒤 조건(`revalidate === 0`)이 같이 참일 때만 걸린다. 즉 **토큰이 실린 fetch에
revalidate를 명시하면 캐시될 수 있다**. "Authorization이 있으면 Next가 알아서 안 캐시하겠지"라고
믿고 조건을 느슨하게 짰으면 개인 응답이 공유 캐시에 들어갔을 것이다. KAN-308의 명시적 `no-store`
가드가 취향이 아니라 필수였다는 게 확인됐다.

### 검증

로컬 BE(8080)를 띄우고 `logging.fetches`를 잠깐 켜서 dev 서버 로그를 직접 봤다(확인 후 제거).

```
GET /articles/8032 200 in 764ms (application-code: 504ms)
 │ GET .../api/v1/articles/8032 200 in 98ms (cache hit)
GET /articles/8032 200 in 68ms (application-code: 56ms)
 │ GET .../api/v1/articles/8032 200 in 1ms (cache hit)
 │ GET .../api/v1/articles/8032/comments?size=10 200 in 1ms (cache hit)
 │ GET .../api/v1/articles?size=6&teamId=1 200 in 1ms (cache hit)
```

BE 왕복이 98ms에서 1ms로, 페이지 렌더가 764ms에서 65ms로 떨어졌다. 크롤러가 보는 시간이 이
차이다.

로그인 유저 경로가 안 바뀌었는지도 확인했다. 기사 페이지는 상세·댓글·추천을 전부
`getAccessToken()` 결과와 함께 부르므로 토큰이 실리고, 그러면 `no-store`로 빠진다. 즉 방금 쓴
댓글이나 방금 누른 좋아요는 예전처럼 즉시 반영된다. 캐시를 타는 건 토큰 없는 요청 — 비로그인
방문자와 크롤러뿐이고, 비로그인은 댓글·좋아요 자체가 불가라 60초 지연으로 어긋날 기대가 없다.

format:check, lint, check-types, build 전부 통과. 빌드 결과에서 라우트 구분(정적/동적)도 이전과
같다 — 동적 판정의 원인은 여전히 쿠키 읽기지 fetch 캐시가 아니기 때문이다.
