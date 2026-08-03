# 0071. SEO Step 1 — robots, sitemap, 메타데이터, canonical 상호 선언 (KAN-346)

2026-08-03. [SEO 전략 계획](../seo-strategy.md)(KAN-345)의 Step 1을 mobile·web 양쪽에
일괄 적용한 세션이다. [ADR 0070](0070-seo-step0-site-url-og.md)에서 깔아 둔 기반
(`NEXT_PUBLIC_SITE_URL`, OG 기본 이미지, canonical 도메인 A안 결정) 위에 실제 색인
장치를 얹었다. 전부 코드 레벨 작업이고, 특강 표현을 빌리면 "이것만 하면 구글에
존재는 한다"의 그 목록이다.

## 뭘 했나

1. `app/robots.ts` — 크롤러 정책. 두 앱 동일.
2. `app/sitemap.ts` — 정적 라우트 + BE 기사 전건 나열. 두 앱 동일 구조.
3. 루트 레이아웃 메타데이터 보강 — `metadataBase`, `title.template`, openGraph·twitter
   기본값. web에는 빠져 있던 `viewport`도 추가.
4. 기사 상세 `generateMetadata` — 기사 제목·요약으로 페이지 고유 메타 생성.
5. canonical + m-dot 상호 선언 — 주요 페이지 전부. 이를 위한 교차 도메인 env 2개 추가.

## robots — AI 크롤러까지 전부 연다

`app/robots.ts`는 Next의 파일 기반 메타데이터 라우트다. 이 이름으로 함수를 export하면
빌드가 `/robots.txt` 라우트로 컴파일한다. `public/`에 정적 파일을 두는 방법과 달리
standalone 산출물에 그대로 들어가서, 배포 워크플로의 public 수동 복사 스텝(ADR 0059)과
무관하게 동작한다. OG 이미지를 `app/`에 둔 것과 같은 이유다(ADR 0070).

정책에서 하나 결정이 있었다. 작업 중에 사용자가 "성장해야 하니 모든 AI 크롤러도 다
가져갈 수 있게 열어 달라"고 정리해 줬다. 요즘 뉴스 사이트들이 GPTBot·ClaudeBot·
PerplexityBot 같은 AI 학습·검색 크롤러를 robots에서 막는 흐름이 있는데, PLick은
반대로 간다 — 지금은 콘텐츠가 어디에든 인용되고 노출되는 것 자체가 이득인 단계다.
그래서 봇별 차단 룰 없이 `userAgent: "*"`에 전체 Allow 하나만 뒀고, 코드 주석에
이 의도를 박아 뒀다(나중에 누가 "왜 안 막았지" 하고 차단 룰을 넣지 않도록).

Disallow는 색인 가치가 없거나 개인화된 경로 네 개만: `/api/`, `/oauth/`, `/me/`,
`/onboarding/`. 로그인·회원가입은 막지 않았다 — "plick 로그인" 같은 브랜드 검색의
랜딩이 될 수 있다.

한 가지 확인하고 넘어간 것: proxy.ts(세션 갱신 프록시)의 matcher가
`.*\\.` 패턴으로 확장자 포함 경로를 제외해서, `/robots.txt`와 `/sitemap.xml` 요청은
프록시를 아예 타지 않는다. 크롤러 요청에 쿠키 갱신 로직이 끼어들 일이 없다.

## sitemap — 요청 시점 생성으로 가야 했던 이유

`app/sitemap.ts`도 같은 파일 컨벤션으로 `/sitemap.xml`이 된다. 정적 라우트(홈, 릴스,
web은 기사 목록도)에 BE 기사 전건을 이어 붙인다. 기사 목록은 이미 있는
`getArticles`(커서 페이징, 페이지당 최대 30건)를 BE가 nextCursor를 null로 줄 때까지
돌려서 모은다. lastmod는 발행 시각(`publishedAt`)이다.

여기서 이 세션의 제일 중요한 기술 판단이 나온다. `export const dynamic =
"force-dynamic"`을 박았다. 왜냐면 Next의 메타데이터 라우트는 기본이 정적이다 —
동적 API(쿠키 등)를 안 쓰면 `next build` 시점에 한 번 실행해서 결과를 산출물로
굳힌다. 우리 sitemap은 안에서 BE를 부르는데, 빌드는 GitHub Actions 러너에서 돈다
(ADR 0059 — 산출물의 네이티브 바이너리 때문에 러너 빌드가 강제다). 러너에서 BE가
안 닿으면 빌드가 깨지고, 닿더라도 기사 목록이 빌드 시점으로 얼어붙어서 이후 발행되는
기사가 사이트맵에 안 실린다. 사이트맵은 "새 기사를 크롤러에게 알리는" 장치라 얼어
있으면 존재 의미가 없다. force-dynamic으로 요청이 올 때마다 생성하게 했다. 크롤러가
가끔 받아 가는 파일이라 요청마다 BE를 도는 비용은 무시할 수준이다.

검증도 그 지점을 노렸다. `API_BASE_URL=http://127.0.0.1:9`(무조건 접속 실패하는
포트)로 `pnpm build`를 돌려서, BE 없이 빌드가 성공하고 라우트 테이블에
`/sitemap.xml`이 ƒ(Dynamic), `/robots.txt`가 ○(Static)으로 찍히는 걸 확인했다.
CI 러너 상황의 재현이다.

런타임에 BE가 죽어 있을 때도 대비했다. 페이징 루프를 try/catch로 감싸 실패하면
기사 없이 정적 라우트만 내려보낸다. 사이트맵이 500을 주면 크롤러가 사이트 전체
상태를 의심하니, 반쪽짜리라도 200이 낫다.

상한은 5,000 URL로 끊었다. 사이트맵 규격 한도(50,000)에 닿으려면 한참 남았지만
무한 루프 방어 겸이고, 여기 걸릴 만큼 기사가 쌓이면 전략 문서에 적어 둔 대로
사이트맵 인덱스 분할이 선행 과제다. 로컬 BE(공유 DB) 기준으로 지금 1,651건이 나왔다.

모바일 사이트맵에는 미묘한 구석이 하나 있다. 사이트맵 가이드라인은 canonical URL만
실으라고 하는데, 모바일 페이지들의 canonical은 아래에서 설명할 상호 선언 때문에 전부
데스크톱 URL이다. 그래도 모바일 도메인 사이트맵을 만들어 둔 건 Search Console에
`m.plick.co.kr` 속성을 따로 등록해 크롤 상태를 볼 계획이고, alternate 발견 경로로도
쓸모가 있어서다. 구글이 모바일 URL들을 "중복, 데스크톱이 대표"로 분류하는 건 이
구조에서 정상 동작이다.

## 루트 메타데이터 — 상속 구조를 이해하고 얹기

두 앱 layout.tsx의 metadata를 보강했다.

- `metadataBase: new URL(SITE_URL)` — 이하 모든 상대 URL 메타(og:image, canonical 등)를
  절대 URL로 완성해 주는 기준점. Step 0에서 도입한 `NEXT_PUBLIC_SITE_URL`이 드디어
  소비처를 얻었다.
- `title: { default: "PLick", template: "%s | PLick" }` — template은 자식 페이지가
  문자열 title을 export하면 "릴스 | PLick"처럼 감싸 주는 규칙이고, 자기 자신(루트)에는
  적용되지 않는다. 아무것도 export 안 한 페이지는 default가 나간다.
- openGraph 기본값(siteName, type website, locale ko_KR)과 twitter 카드
  (`summary_large_image`).

og:title을 명시하지 않았는데, 이건 확인하고 내린 선택이다. Next의 메타데이터
리졸버는 `openGraph.title`이 없으면 `metadata.title`(template 적용 후)을 그대로
내려 준다. dev 서버 HTML을 curl로 떠서 og:title·twitter:title이 title과 같이
찍히는 걸 확인했다. 그래서 루트에는 안 적고, 기사 상세처럼 명시적으로 다른 값을
줄 곳만 적는다.

og:image는 여기서 아무것도 안 했는데도 전 페이지에 나간다 — Step 0에서 넣은
`app/opengraph-image.png` 파일 컨벤션이 계속 일하고 있고, metadataBase가 생기면서
그 URL이 절대 경로로 완성됐다.

web 레이아웃에는 `viewport` export도 추가했다. 데스크톱 앱이라고 뷰포트 메타를
빼먹으면, 모바일 기기로 `plick.co.kr`을 열었을 때 980px 가상 뷰포트로 축소 렌더되고
구글 모바일 친화성 평가에서도 감점이다. 모바일 앱에 있는 노치 대응
(`viewportFit: "cover"`)은 데스크톱엔 필요 없어 뺐다.

## canonical — 레이아웃에 두면 안 되는 이유, m-dot 상호 선언

처음 설계에서 주의한 게 canonical의 위치다. 메타데이터는 레이아웃에서 페이지로
상속되는데, canonical을 루트 레이아웃에 두면 모든 하위 페이지가 같은 URL(홈)을
canonical로 선언해 버린다. "이 사이트의 모든 페이지는 홈의 복제본"이라고 구글에
말하는 셈이다. 그래서 canonical은 전부 페이지 단위로 선언했다.

선언 구조는 Step 0에서 확정한 A안(구글의 별도 모바일 URL 패턴) 그대로다.

- 데스크톱(web) 페이지: 자기 URL을 canonical로, 대응하는 모바일 URL을
  `rel="alternate" media="only screen and (max-width: 640px)"`로 선언.
- 모바일(mobile) 페이지: 대응하는 데스크톱 URL을 canonical로 선언. 자기 URL이 아니다.

이 상호 참조로 구글은 두 도메인의 같은 콘텐츠를 한 쌍으로 묶고, 랭킹 시그널을
데스크톱 URL 하나로 모은 채 모바일 검색 결과에는 모바일 URL을 내보낸다. 전략 문서가
진단했던 "도메인 중복으로 시그널 분산" 문제의 답이다. media 속성은 크롤러용
시그널일 뿐 실제 브라우저 리다이렉트와는 무관하다.

적용 페이지는 홈·릴스·기사 상세·로그인·회원가입(+ web 전용 기사 목록). 기사 목록은
모바일에 대응 페이지가 없어서 alternate 없이 canonical만 달았다 — 상호 선언은 1:1
대응이 있는 페이지끼리만 성립한다. `/me`·`/onboarding`은 robots에서 막힌 경로라
안 달았다.

### 교차 도메인 env 2개

이 상호 선언을 조립하려면 각 앱이 상대 앱의 origin을 알아야 한다. 모바일은 데스크톱
URL(canonical 대상)을, 웹은 모바일 URL(alternate 대상)을. 자기 origin은
`NEXT_PUBLIC_SITE_URL`로 아는데 상대 것이 없다.

"m. 접두사를 붙였다 떼면 되지 않나" 싶지만 로컬에서 무너진다 — 로컬은 포트로
갈리지(3000/3001) 서브도메인이 아니다. 도출 대신 env를 정직하게 추가했다. 모바일에
`NEXT_PUBLIC_WEB_SITE_URL`, 웹에 `NEXT_PUBLIC_MOBILE_SITE_URL`. 배관은 ADR 0070의
`NEXT_PUBLIC_SITE_URL`과 완전히 같은 길이다: 각 앱 `.env.example`·`.env.local`,
turbo.json `globalEnv`(빌드 캐시 무효화 등록), deploy.yml 빌드 스텝 상수(시크릿이
아니라 평문 — 오설정을 PR 리뷰 눈으로 잡기 위해).

env 소비는 각 앱 `_constants/site.ts`로 모았다. `process.env.NEXT_PUBLIC_*`를 여기서
한 번만 읽고 로컬 폴백을 달아, 페이지들은 상수만 import한다. 웹 쪽에는 media 조건
문자열(`MOBILE_ALTERNATE_MEDIA`)도 상수로 뒀다 — 선언마다 문자열을 반복하다 한 글자
틀리면 쌍이 안 맞는다.

## 기사 상세 generateMetadata — 이중 페치 고민

기사 하나하나가 롱테일 검색어의 랜딩이라(전략 문서 3절) 기사 상세가 이번 작업의
최우선이었다. `generateMetadata`에서 상세 API를 불러 title(기사 제목 → template이
"| PLick"을 붙인다), description(요약을 160자에서 말줄임), og:type article,
`article:published_time`, canonical(양 앱 모두 데스크톱 기사 URL)을 만든다.

고민한 지점은 이중 페치다. 페이지 본문도 `getArticle`을 부르는데 generateMetadata가
또 부른다. 결론은 "익명으로 부르면 공짜에 가깝다"였다. Next는 같은 렌더 패스 안에서
URL과 옵션이 같은 fetch를 자동으로 중복 제거(dedupe)한다. 본문 쪽은 로그인 시
토큰을 실어 부르지만(likedByMe 때문), 메타데이터는 유저와 무관한 값들이라 토큰
없이 불렀다 — 비로그인 방문(크롤러 포함 대부분)에서는 두 호출이 완전히 같아 dedupe로
한 번만 나가고, 로그인 방문에서만 익명 호출 하나가 더 나간다. 오히려 토큰을 실으면
`apiFetch`가 no-store를 박아서 dedupe가 확실히 깨진다. 크롤러 트래픽 기준으로는
추가 비용이 사실상 없다.

없는 기사(404)는 catch에서 빈 메타데이터를 돌려준다. 어차피 페이지 본문이
`notFound()`로 떨어져서 메타는 의미가 없고, generateMetadata에서 예외를 그대로
던지면 not-found 화면 대신 에러가 된다.

말줄임 유틸(`truncateText`)은 두 앱의 generateMetadata가 같이 쓰게 되어 처음부터
`@plick/domain` format에 뒀다(ADR 0011 게이트 — 두 번째 사용처가 이미 확정).

## 검증

로컬 BE를 띄운 채 dev 서버 두 개를 올리고 curl로 응답을 떴다.

- `/robots.txt` 두 앱: Allow/Disallow 4종/Sitemap 절대 URL 정상.
- `/sitemap.xml`: mobile 1,651 URL, web 1,652(기사 목록 라우트 +1). lastmod 정상.
- mobile 홈: canonical이 웹 origin을 가리키고, og:title·twitter 카드·og:image 전부 출력.
- mobile 기사 상세(8032): `<title>맨체스터 유나이티드, … | PLick</title>`, 고유
  description, canonical `…:3000/articles/8032`, og:type article, published_time.
- web 홈·릴스·기사 상세: canonical 자기 URL + `rel="alternate" media="…640px…"`가
  대응 모바일 URL을 가리킴. viewport 메타 출력.
- BE 접속 불가 상태의 `pnpm build` 성공 + sitemap이 Dynamic 라우트로 분류.

format:check·lint·check-types·build 전부 통과.

## 남긴 것

- Search Console·네이버 서치어드바이저 등록과 sitemap 제출(Step 1-6)은 코드 밖 운영
  작업. 두 도메인 모두 등록한다.
- 실배포에서 `/robots.txt`·`/sitemap.xml` 응답 확인(Step 1-7)과, 기사 링크를 카톡에
  붙였을 때 제목·요약·이미지 카드가 뜨는지 확인.
- Step 2: `/reels/[postId]` 신설, 팀 허브 `/teams/[slug]`, JSON-LD, `next/og` 동적
  OG 이미지.
- 관련: [seo-strategy.md](../seo-strategy.md), [ADR 0070](0070-seo-step0-site-url-og.md),
  [ADR 0059](0059-mobile-ec2-deploy.md), [ADR 0047](0047-share-link-dialog.md)
