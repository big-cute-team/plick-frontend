# 0073. JSON-LD 구조화 데이터 + 동적 OG 이미지 (KAN-351)

2026-08-04. [SEO 전략 계획](../seo-strategy.md)(KAN-345)의 Step 2-3(JSON-LD)과
Step 2-4(동적 OG 이미지)를 실행한 세션이다. 눈에 보이는 화면은 한 픽셀도 안 바뀌는
작업인데, 공유 카드와 검색 결과에서 보이는 모습은 완전히 달라진다.

## 뭘 하는 티켓이었나

Step 0~1(KAN-346)에서 robots, sitemap, 메타데이터, canonical까지 깔았고,
KAN-350에서 팀 허브(`/teams/[slug]`)를 만들었다. 남은 건 두 가지였다.

1. JSON-LD 구조화 데이터. 홈에 Organization + WebSite, 기사 상세에 NewsArticle,
   팀 허브에 CollectionPage. 구글이 페이지의 "정체"를 추측이 아니라 선언으로 알게
   하는 장치고, 기사 리치 결과(썸네일·날짜·매체명이 붙는 검색 결과)의 자격 요건이다.
2. 기사별 동적 OG 이미지. 발행 기사의 `imageUrl`이 전건 null이라(전략 문서의 데이터
   공백) 기사 이미지를 OG로 쓰는 전략이 성립하지 않는다. 그래서 팀 컬러 배경 + 팀
   로고 + 기사 제목 + 루머 단계 배지를 코드로 그려서 데이터 공백을 디자인으로 메꾼다.

시작 전에 사용자와 세 가지를 정했다. 동적 OG의 적용 범위는 기사 상세 + 팀 허브(홈은
ADR 0070의 정적 브랜드 이미지 유지), 로고 연출은 다크 배경에 팀 컬러 글로우 + 우측
로고 반투명 워터마크, 폰트는 저장소 커밋. 전부 권장안대로 확정됐다.

## 렌더는 web 한 곳에서만 한다

첫 설계 결정. OG 이미지를 그리려면 한글 폰트(1.5MB)와 팀 로고 PNG 6장(700KB)이
서버 런타임에 필요하다. 같은 자산을 mobile에도 복제 커밋하면 저장소가 4MB 넘게
무거워지고, 카드 디자인을 고칠 때마다 두 앱을 같이 고쳐야 한다.

그래서 렌더 라우트는 canonical 도메인인 web(`plick.co.kr`)에만 두고, 모바일 페이지의
og:image는 web의 렌더 URL을 절대 경로로 가리키게 했다. og:image가 페이지와 다른
도메인이어도 크롤러는 상관하지 않는다. 카카오톡이든 트위터든 어느 도메인의 링크를
공유해도 같은 카드가 나오고, 시그널을 한 도메인에 모은다는 canonical A안(ADR 0070)과
결도 같다. 대신 로컬에서 모바일 공유 카드를 보려면 web dev 서버(3000)가 같이 떠
있어야 한다는 트레이드오프가 생기는데, `pnpm dev`가 원래 둘을 같이 띄우므로 실제로
불편할 일은 없다.

## 파일 컨벤션의 함정 — URL에 빌드 해시가 붙는다

처음엔 Next의 파일 컨벤션대로 `articles/[postId]/opengraph-image.tsx`를 만들었다.
이 컨벤션은 같은 세그먼트의 og:image 메타 태그를 자동으로 만들어 줘서 제일 깔끔해
보였다. 그런데 dev 서버로 팀 허브를 열어 보니 태그가 이렇게 나왔다.

```html
<meta
  property="og:image"
  content="…/teams/tottenham/opengraph-image-1r0o8c?f434bffeb3448ba3"
/>
```

`opengraph-image` 뒤에 `-1r0o8c`라는 접미사가 붙는다. 동적 세그먼트의 파일 기반
메타데이터 이미지에 Next가 붙이는 해시인데, 빌드 산출물에 따라 달라질 수 있는
값이다. 같은 앱 안에서는 Next가 태그를 알아서 만들어 주니 문제가 없지만, 우리는
mobile 앱이 web 앱의 이미지 URL을 손으로 조립해야 한다. 다른 앱의 빌드 해시를 알
방법은 없다. 실제로 손으로 `/teams/tottenham/opengraph-image`를 열면 404였다.

그래서 파일 컨벤션을 버리고 라우트 핸들러로 바꿨다. `articles/[postId]/og/route.tsx`가
`GET /articles/{id}/og`로 ImageResponse를 직접 돌려준다. URL이 예측 가능해지는 대신
자동 배선이 사라지므로, og:image 태그는 양 앱의 `generateMetadata`가 명시적으로
선언한다(web은 상대경로로 metadataBase에 얹고, mobile은 `WEB_SITE_URL` 절대경로).
파일 컨벤션이 공짜로 주던 og:image:width/height/alt도 images 객체에 직접 적었다.

부수 효과로 캐시 제어권도 생겼다. ImageResponse의 기본 Cache-Control은 1년
immutable인데, 기사를 못 받았을 때 내려보내는 폴백 카드까지 1년 박제되면 곤란하다.
라우트 핸들러라 `max-age=3600, s-maxage=86400`으로 직접 줄일 수 있었다.

## satori가 못 하는 것들을 우회하기

`next/og`의 ImageResponse는 내부적으로 satori가 JSX를 SVG로 바꾸고 resvg가 PNG로
래스터라이즈한다. ADR 0070의 정적 OG 스크립트에서 resvg를 이미 겪어서 폰트 쪽은
예상이 됐는데, satori 고유의 제약이 몇 개 더 있었다.

- webp를 못 읽는다. 팀 로고가 `public/teams/*.webp`뿐이라 그대로 쓸 수 없었다.
  `scripts/og-image/team-logos.mjs`(sharp)로 512x512 투명 캔버스에 contain으로 앉힌
  PNG 사본을 만들어 `apps/web/assets/og/teams/`에 커밋했다. 크기를 통일한 건 로고
  원본의 비율이 제각각이라(토트넘은 237x468 세로형) 템플릿이 비율 계산을 안 하게
  하려는 것. 처음 뽑으니 장당 300~400KB라 `png({ palette: true })` 팔레트 양자화로
  총 692KB까지 줄였다.
- CSS 변수와 Tailwind를 못 읽는다. 팀 컬러·브랜드 색은 `theme.css` 토큰의 hex를
  `OgCard.tsx` 상수로 복사했다. 토큰이 바뀌면 같이 바꿔야 하는 동기화 포인트가
  하나 늘어난 건데, 정적 OG 스크립트(`render.mjs`)와 같은 규약이라 새 종류의 빚은
  아니다.
- 폰트는 바이트로 직접 줘야 한다. 앱이 CDN CSS로 쓰는 Pretendard를 satori에게는
  otf 파일로 넘겨야 한다. ADR 0070 때는 일회성 스크립트라 커밋 없이 다운로드로
  풀었지만, 이번엔 서버가 요청마다 쓰는 런타임 자산이라 CDN fetch는 장애 전파
  지점이 된다. SemiBold 하나(1.5MB)를 `apps/web/assets/og/`에 커밋했다(사용자 확정).
- 한글 줄바꿈이 아무 데서나 끊긴다. 첫 렌더에서 "킷 마게트/슨"처럼 단어 중간이
  잘렸다. `wordBreak: "keep-all"`을 제목에 줘서 어절 단위로 끊게 했다.

카드 디자인은 정적 브랜드 OG의 연장으로 잡았다. 다크 배경(#0b0d12)에 라디얼
글로우를 까는 건 같고, 글로우 색이 accent에서 대표 팀 컬러로 바뀌며, 우측에 팀
로고가 워터마크로 얹힌다. 기사 카드는 제목이 주인공이라 로고 투명도 0.3, 팀 허브
카드는 로고가 아이덴티티라 0.5로 올렸다. 대표 팀은 `teams[0]`을 쓴다(카드 UI와
같은 규약). 팀이 없는 기사와 모르는 slug, BE 장애 시에는 브랜드 폴백 카드(accent
글로우 + 태그라인)를 내려보낸다. 크롤러에게 500이나 이미지 없음보다 기본 카드가
낫다.

## 자산이 standalone에 실리는가 — nft 추적

배포 리스크가 하나 있었다. EC2 standalone 배포(ADR 0059)는 `public/`을 자동 포함하지
않아 수동 복사 스텝에 의존한다. OG 자산까지 그 스텝에 얹으면 배포 워크플로를 또
고쳐야 하고 빠뜨리면 조용히 깨진다.

그래서 자산을 `public/`이 아니라 `apps/web/assets/og/`에 두고
`readFile(join(process.cwd(), "assets/og/…"))`로 읽었다. Next의 파일 추적(nft)은 이
패턴을 정적 분석해서 읽는 파일을 standalone 산출물에 포함시킨다. 로고 경로는 마지막
세그먼트가 `${code}.png` 동적 값이라 추적이 될지 반신반의했는데, 빌드 후
`.next/standalone/apps/web/assets/og/`를 확인하니 폰트와 PNG 6장이 전부 들어
있었다. nft가 경로 앞부분이 리터럴이면 디렉터리째 포함시켜 준 것. `next.config`의
`outputFileTracingIncludes`를 만질 필요가 없었다.

읽은 바이트는 모듈 스코프에 캐시했다. OG 요청마다 디스크를 다시 읽지 않게 하는
것뿐이고, 자산은 배포 단위로만 바뀌니 무효화 걱정이 없다. 로고는 satori에 data
URI로 넘긴다. 절대 URL로 주면 렌더 중에 자기 서버로 HTTP를 되돌리게 되는데, 요청
한 번이 두 번이 되는 데다 빌드 시점 렌더에서는 서버가 아예 없다.

## JSON-LD — 빌더는 domain, 렌더는 ui

JSON-LD는 두 앱이 같은 값을 내야 한다. 같은 콘텐츠가 두 도메인에 있을 때 구글
별도 모바일 URL 가이드는 양쪽에 동일한 구조화 데이터를 요구하고, URL 필드는
canonical 도메인 기준이어야 시그널이 갈리지 않는다. 값 조립이 두 앱에 복제되면
반드시 드리프트가 생기므로(ADR 0011·0018의 교훈) 빌더를 `@plick/domain/jsonld`로
한 곳에 두고, 앱은 자기 사이트 URL만 인자로 넘긴다. mobile도 `WEB_SITE_URL`을
넘겨서 두 앱의 출력이 바이트 단위로 같다.

- 홈: Organization(브랜드 검색 "plick"·"플릭"의 지식 패널 후보) + WebSite(검색
  결과의 사이트명 안정화). `@id`를 `…/#organization` 식으로 박아 WebSite의
  publisher가 참조로 연결되게 했다.
- 기사 상세: NewsArticle. headline·description·datePublished는 기사 데이터
  그대로, image는 동적 OG URL, author는 대표 기자를 Person으로(없으면 서비스
  Organization), publisher는 인라인 Organization이다. 기사 페이지에는 홈의
  Organization 노드가 없어서 `@id` 참조만 두면 닿지 않기 때문이다.
- 팀 허브: CollectionPage + ItemList. 서버 렌더된 첫 페이지 기사만 싣는다.
  크롤러가 보는 초기 HTML과 같은 범위라서다. 피드 로드가 실패하면 ItemList 없이
  페이지 선언만 남긴다. 팀 허브는 화면이 `HomeScreen` 공용이라(KAN-350) 스크립트도
  sr-only h1 옆, 즉 HomeScreen의 팀 분기 안에 심었다. 웹의 `/articles/teams/[slug]`는
  canonical이 팀 허브를 가리키므로 JSON-LD를 따로 싣지 않았다.

렌더는 `@plick/ui`의 `JsonLd` 컴포넌트 하나다. `<script type="application/ld+json">`에
직렬화해 넣는 게 전부인데, 한 가지 가드를 뒀다. `JSON.stringify` 결과의 `<`를
유니코드 이스케이프 `\u003c`로 치환한다. 기사 제목에 파싱이 어긋난 원문 트윗이
통째로 들어온 행이 있어서(`ArticleDetail.title` 주석에 기록된 실데이터 문제)
`</script>` 조각이 태그를 조기 종료시키는 XSS 벡터가 될 수 있다. JSON 파서에게
`\u003c`는 `<`와 같은 문자라 검색엔진 해석에는 영향이 없다.

메타데이터를 만지다 실수도 하나 있었다. 웹 팀 허브의 `generateMetadata`에 openGraph
블록을 새로 넣으면서 기존 `openGraph: { title, description }` 줄을 못 보고 지나쳐
객체에 같은 키가 두 번 들어갔다. JS에서 중복 키는 뒤가 이기므로 새로 넣은 images가
조용히 사라지는 버그가 됐을 텐데, 파일을 다시 읽다가 발견해서 기존 줄을 지우는
쪽으로 합쳤다.

## 검증

로컬 BE(8080)를 띄운 상태에서 dev 서버로 확인했다.

- `GET /articles/8032/og`, `/teams/{6팀 slug}/og` 전부 200 image/png. 실제 카드를
  브라우저로 열어 팀 컬러 글로우·로고 워터마크·단계 배지·워드마크 확인.
- 없는 기사(`/articles/999999/og`)와 모르는 slug(`/teams/unknown/og`)는 브랜드
  폴백 카드로 200.
- 웹 기사 상세의 og:image·twitter:image가 `/articles/{id}/og`를 가리키고, 모바일
  기사 상세는 `http://localhost:3000/…/og`(배포에선 `https://plick.co.kr/…`)를
  가리키는 것 확인. twitter:image는 openGraph.images에서 자동 파생됐다.
- 홈 2종(Organization·WebSite), 기사 NewsArticle, 팀 허브 CollectionPage JSON-LD가
  두 앱 모두 초기 HTML에 들어가는 것 확인. 페이지당 스크립트 수를 셀 때 RSC flight
  페이로드에 직렬화 사본이 한 번 더 잡히는 것 때문에 잠깐 헷갈렸는데, 실제 script
  태그는 기대 개수 그대로였다.
- `pnpm build` 후 `.next/standalone/apps/web/assets/og/`에 폰트·로고 전부 포함 확인.
- format:check·lint·check-types·build 전부 통과. 화면 UI는 변경 없음(스크린샷 대조,
  콘솔 에러 없음).

배포 후에는 실도메인에서 카카오톡 디버거·트위터 카드 validator·구글 리치 결과
테스트로 한 번 더 확인해야 한다. 이건 코드 밖 운영 작업으로 남긴다.

## 남긴 것

- 전략 문서 Step 2에서 남은 건 `/reels/[postId]`(2-1), 시맨틱 마크업 감사(2-5),
  캐시 전략(2-6). Step 3(콘텐츠·운영)은 별도.
- 토트넘 팀 컬러(#132257)는 다크 배경과 명도가 가까워 글로우가 거의 안 보인다.
  로고가 아이덴티티를 대신 채워 줘서 그대로 뒀는데, 카드가 밋밋하다는 피드백이
  오면 팀별 글로우 보정값을 검토한다.
- OG 카드 색 상수(`OgCard.tsx`)는 `theme.css` 토큰과 수동 동기화다. 토큰 변경 시
  체크리스트에 넣을 것.
- 관련: [seo-strategy.md](../seo-strategy.md), [ADR 0070](0070-seo-step0-site-url-og.md),
  [ADR 0071](0071-seo-step1-robots-sitemap-metadata.md), [ADR 0072](0072-team-hub-url-filter.md),
  [ADR 0059](0059-mobile-ec2-deploy.md)
