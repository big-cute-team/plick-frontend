# PLick SEO 전략 계획 (KAN-345)

2026-08-03 작성. 소마 특강 "개발자가 할 수 있는 최고의 마케팅, SEO"(강준혁, (주)산군) 자료와
현재 코드베이스 전수 조사를 바탕으로 세운 실행 계획이다.

## 1. 목표

두 가지를 목표로 잡는다.

- G1. 특정 팀이나 선수를 검색했을 때(예: "토트넘 이적 루머", "손흥민 이적설") PLick의 릴스
  페이지나 기사 페이지가 구글 검색 최상단에 노출된다.
- G2. "plick", "플릭", "PL", "프리미어리그" 같은 서비스·카테고리 검색어에서 PLick 서비스 소개가
  최상단에 노출된다.

단, 검색어마다 난이도가 완전히 다르다는 걸 처음부터 인정하고 간다.

| 검색어 유형 | 예시                                              | 경쟁 상대                                        | 현실적 목표 시점                                 |
| ----------- | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| 브랜드      | "plick", "플릭"                                   | 거의 없음(동명 서비스 일부)                      | 색인 후 1~2개월 내 1위                           |
| 롱테일      | "손흥민 이적설 정리", "토트넘 이적 루머 모아보기" | 블로그·커뮤니티 글                               | 3~6개월                                          |
| 연관        | "프리미어리그 이적 루머", "PL 이적시장"           | 스포츠 매체 기사                                 | 6개월+                                           |
| 핵심        | "프리미어리그", "PL"                              | 공식 리그 사이트, 네이버 스포츠, 위키, 대형 매체 | 장기 과제. 도메인 신뢰도가 쌓인 뒤에나 도전 가능 |

특강 자료의 핵심 프레임을 그대로 따른다: SEO는 "한 방"이 아니라 "쌓기" 게임이고,
1단계 롱테일 → 2단계 연관 키워드 → 3단계 핵심 키워드 순서로 점령해 간다.
그리고 SEO는 복리라서, 컷오버 직후인 지금 기반을 깔아야 3~6개월 뒤 안정적 유입이 생긴다.

## 2. 현황 진단 (2026-08-03 코드 기준)

### 2.1 전무한 것

| 항목                                               | mobile | web  | 비고                                                                   |
| -------------------------------------------------- | ------ | ---- | ---------------------------------------------------------------------- |
| robots.txt / robots.ts                             | 없음   | 없음 | 구글에 "존재"하기 위한 최소 요건                                       |
| sitemap.xml / sitemap.ts                           | 없음   | 없음 | 〃                                                                     |
| Google Search Console / 네이버 서치어드바이저 등록 | 없음   | 없음 | 〃                                                                     |
| 페이지별 metadata / generateMetadata               | 없음   | 없음 | 루트 레이아웃의 `title: "PLick"` 하나가 전부. 기사 상세도 예외 없음    |
| metadataBase / canonical / title template          | 없음   | 없음 | 사이트 URL을 담은 환경변수 자체가 없음                                 |
| Open Graph / 트위터 카드 태그·이미지               | 없음   | 없음 | 기사 링크를 카톡에 붙여도 전부 "PLick / 오늘의 PL 루머를 한 장에"로 뜸 |
| JSON-LD 구조화 데이터                              | 없음   | 없음 | NewsArticle, Organization, WebSite 전부 미구현                         |
| manifest, apple-icon, opengraph-image              | 없음   | 없음 | favicon.ico만 있음                                                     |
| 팀·선수 랜딩 페이지                                | 없음   | 없음 | 팀은 클라 필터 탭이라 URL조차 없음                                     |
| 릴 개별 URL (`/reels/[postId]`)                    | 없음   | 없음 | handoff 원설계에 있었으나 미구현(ADR 0047이 범위 밖으로 미룸)          |

SEO를 다룬 ADR도 0건이다. 즉 지금까지 SEO 관점의 작업이 한 번도 없었다.

### 2.2 구조적 문제

1. 도메인 중복. `plick.co.kr`(web)과 `m.plick.co.kr`(mobile)에 같은 콘텐츠(`/articles/{id}`)가
   양쪽으로 존재하는데 canonical도 `rel="alternate"` 상호 선언도 없다. 구글이 두 URL을
   중복 콘텐츠로 보고 랭킹 시그널이 분산되거나, 의도치 않은 쪽이 대표 URL로 잡힐 수 있다.
2. thin content. 기사 본문의 실체가 `summary` 한 필드다(`packages/domain/src/types.ts:101`).
   분량이 얇아 콘텐츠 품질 평가에서 불리하다.
3. OG 이미지 소스 부재. `ArticleDetail.imageUrl`이 현재 발행 기사 전건 null이라
   "기사 이미지를 OG로" 전략이 데이터상 성립하지 않는다. 이미지 자산은 팀 로고 webp 6장이 전부다.
4. 사이트 URL 환경변수 부재. ADR 0047이 `NEXT_PUBLIC_SITE_URL` 도입을 명시적으로 거부하고
   `window.location.origin`을 쓰기로 했다. 공유 링크에는 맞는 결정이었지만 metadataBase,
   canonical, sitemap은 서버가 절대 origin을 알아야 해서 재검토가 필요하다.
5. 배포 제약. `public/` 자산은 standalone 산출물에 자동 포함되지 않아 배포 워크플로의
   수동 복사 스텝에 의존한다(ADR 0059). env는 빌드 타임에 굳는다(`API_BASE_URL`과 동일 제약).
6. 캐시 전략 부재. `dynamic`, `revalidate`, `generateStaticParams`가 전 라우트에 없다.
   쿠키를 읽는 루트 레이아웃 때문에 사실상 전부 동적 렌더 — 크롤 예산과 응답 속도에 불리하다.

### 2.3 양호한 것 (이미 깔려 있는 기반)

1. 기사 상세가 완전한 서버 컴포넌트다. `<h1>{title}</h1>`과 본문 문단이 초기 HTML에
   그대로 들어간다. 크롤러가 JS 실행 없이 본문을 읽을 수 있다.
2. `html lang="ko"`가 두 앱 모두 정상이다.
3. proxy.ts가 비로그인 요청을 리다이렉트하지 않는다. 크롤러의 색인 경로가 열려 있다.
4. 홈·릴스·기사 목록도 서버 seed(TanStack Query `initialData`) 덕에 첫 화면 콘텐츠가
   SSR HTML에 포함된다.
5. 삭제 기사가 `notFound()`로 제대로 404를 반환한다.
6. Next 16이라 Metadata API, `next/og`, `sitemap.ts` 등 필요한 도구를 전부 쓸 수 있다.

요약하면 렌더링 기반은 이미 SEO 친화적인데, 그 위에 얹는 메타데이터·색인 장치가 0이다.
특강 표현을 빌리면 "만들었는데 아무도 모르는" 상태다. 기반이 좋아서 투자 대비 효과가 크다.

## 3. 전략: 검색어 → 페이지 매핑

구글은 검색어에 가장 잘 맞는 "페이지 하나"를 고른다. 검색어 유형마다 받아줄 페이지(landing
surface)를 정해 두고, 그 페이지를 그 검색어에 최적화한다.

| 검색어                              | 받는 페이지                                              | 상태                                 |
| ----------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| "plick", "플릭"                     | `/` 홈 (서비스 소개 메타 + Organization/WebSite JSON-LD) | 페이지 있음, 메타 없음               |
| "토트넘 이적 루머" 등 팀 검색어     | `/teams/[slug]` 팀 허브 (신설)                           | 페이지 없음                          |
| "손흥민 이적설" 등 선수 검색어      | 개별 기사/릴 상세 + (장기) 선수 허브                     | 기사 페이지 있음, 선수 데이터 미구현 |
| 개별 루머 제목·문장 검색            | `/articles/[postId]` + `/reels/[postId]`                 | 기사만 있음, 메타 없음               |
| "프리미어리그 이적시장" 등 카테고리 | `/` + 팀 허브의 총합(도메인 신뢰도)                      | 장기                                 |

이 매핑에서 나오는 결론:

- 기사 상세 메타데이터가 최우선이다. 콘텐츠가 계속 쌓이는 곳이고, 특강의 "블로그 1개 = 유입
  키워드 1개" 구조를 PLick에서는 기사가 대신한다. 기사 하나하나가 롱테일 검색어의 랜딩이다.
- 팀 허브 페이지가 G1의 핵심 신규 작업이다. "토트넘 이적 루머"를 받아줄 URL이 지금은 없다.
  팀 필터는 zustand 상태라 구글이 도달할 수 없다.
- 선수 검색어는 당장은 기사 상세가 받는다. 도메인에 선수 타입·태그가 없어서(BE `team_tags`가
  팀 전용) 선수 허브는 BE 협업이 필요한 장기 과제로 분리한다.

## 4. 실행 계획

4단계로 나눈다. Step 0~1이 특강의 "5분이면 되는데 안 하는 것들 + Step1 필수 체크리스트",
Step 2가 구조 확장, Step 3이 콘텐츠·운영이다.

### Step 0. 선결 결정 (개발 전 합의 필요)

> 2026-08-03 결정 완료(KAN-346). 1은 A안(`plick.co.kr` canonical) 확정, 2와 3은 구현됨.
> 태그라인은 "프리미어리그 소식을 릴스로"로 확정하고 두 앱 메타데이터 description도
> 이 문구로 통일했다. 기록은 [ADR 0070](adr/0070-seo-step0-site-url-og.md).

1. 대표(canonical) 도메인 결정.
   구글은 2019년부터 모바일 우선 인덱싱이라, 모바일 웹이 주력인 PLick은 `m.plick.co.kr`을
   canonical로 삼는 게 자연스러워 보이지만, m-dot 서브도메인보다 apex 도메인이 브랜드
   검색·백링크 축적에 유리하다. 선택지:
   - A안. `plick.co.kr`을 canonical로, `m.plick.co.kr`은 `rel="alternate"` 선언
     (구글의 별도 모바일 URL 권장 패턴: 데스크톱에 `alternate media`, 모바일에 `canonical`).
   - B안. 반응형 통합으로 가는 로드맵이라면 장기적으로 도메인 하나로 수렴.
     당장은 A안(상호 선언)으로 가고, 통합은 별도 논의로 미루는 걸 권장한다.
2. `NEXT_PUBLIC_SITE_URL` 도입. ADR 0047의 결정(공유 링크는 `window.location.origin`)은
   유지하되, 서버 측 metadataBase·sitemap·canonical 용도로 앱별 사이트 URL 환경변수를
   추가한다. `API_BASE_URL`처럼 빌드 타임에 굳는 제약을 그대로 받으므로 배포 문서에 병기한다.
3. OG 기본 이미지 제작. 1200x630 브랜드 이미지 1장(서비스명 + 태그라인). 기사별 동적 OG는
   Step 2에서 `next/og`로 만들고, 그 전까지 모든 페이지가 이 기본 이미지를 쓴다.

### Step 1. 기술 SEO 기본 (특강 "이것만 하면 구글에 존재는 한다")

> 2026-08-03 코드 몫(1~5) 구현 완료(KAN-346). robots는 AI 크롤러 포함 전체 허용으로
> 확정했다. 기록은 [ADR 0071](adr/0071-seo-step1-robots-sitemap-metadata.md).
> 6(Search Console·네이버 등록)과 7(실배포 검증)은 배포 후 운영 작업으로 남는다.

전부 코드 레벨 작업이고 앱당 반나절 규모다. mobile·web 동시 적용.

1. `app/robots.ts` — 전체 Allow, `/api/`·`/oauth/`·`/me/`·`/onboarding/` Disallow,
   sitemap 위치 명시. proxy.ts matcher가 확장자 경로를 제외하므로 프록시와 충돌 없음.
2. `app/sitemap.ts` — 정적 라우트(`/`, `/reels`, `/articles`) + BE에서 기사 id 목록을 받아
   `/articles/[postId]` 전건 나열. lastmod는 `publishedAt`. 기사 수가 늘면 인덱스 분할.
3. 루트 레이아웃 메타데이터 보강 —
   `metadataBase`, `title.template`("%s | PLick"), `openGraph` 기본값(og:image 포함),
   `twitter` 카드, web 앱에 빠져 있는 `viewport` 추가.
4. `generateMetadata` — `articles/[postId]`에 기사 제목·요약으로 title/description/OG 생성.
   특강 기준: title 60자 이내 핵심 키워드 포함, description 160자 이내. 페이지마다 고유해야 함.
5. canonical + m-dot 상호 선언 — Step 0 결정에 따라 `alternates.canonical`을 양 앱에 적용.
6. Google Search Console + 네이버 서치어드바이저 등록, sitemap 제출. (코드 밖 운영 작업.
   특강이 네이버를 병기했듯 한국 서비스는 네이버 등록도 같이 한다. Bing Webmaster Tools는 선택.)
7. 배포 검증 — standalone 산출물에서 `/robots.txt`, `/sitemap.xml` 응답 확인.
   (라우트 핸들러 기반이라 `public/` 복사 스텝과 무관하게 동작하지만 실배포에서 확인한다.)

완료 기준: Search Console에서 두 도메인 소유 확인·sitemap 제출 완료, 기사 상세를 카톡에
붙였을 때 제목·요약·이미지 카드가 뜬다.

### Step 2. 구조 확장 (검색어를 받아줄 페이지 만들기)

1. `/reels/[postId]` 라우트 신설.
   handoff 원설계("공유 = 게시물 고유 URL + OG 메타 + 딥링크")를 이행하는 작업.
   릴과 기사가 같은 `article_summaries` 행이므로 데이터는 있다. 해당 릴을 첫 슬라이드로
   피드를 여는 서버 페이지 + `generateMetadata`. `/reels`는 피드 진입점으로 유지.
   공유 버튼도 릴에서는 릴 URL을 주도록 `articleShareUrl` 분기(ADR 0047 후속).
   중복 방지: 릴 상세와 기사 상세가 같은 콘텐츠이므로 둘 중 하나(기사 권장)를 canonical로
   선언해 시그널을 모은다.
2. 팀 허브 페이지 `/teams/[slug]` 신설.
   - `@plick/domain` `Team`에 `slug` 필드 추가(`tottenham`, `liverpool`…, 특강 권장대로 영문 slug).
   - 페이지 구성: 팀 정식 명칭(`TEAM_BY_KO_NAME`의 "토트넘 핫스퍼" 등 풀네임을 h1·title에 사용,
     축약명 "토트넘"도 본문에 자연 포함) + 해당 팀 기사 서버 렌더 목록 + 팀 컬러 헤더.
   - BE 기사 목록 API가 이미 팀 필터를 지원하므로(홈 필터가 사용) 서버 fetch로 재사용.
   - sitemap에 6팀 추가. 홈 팀 필터 탭과 푸터에서 내부 링크로 연결(특강: 어디서도 링크 안 된
     페이지는 구글이 못 찾는다).
3. JSON-LD 구조화 데이터.
   - 기사 상세: `NewsArticle`(headline, datePublished, author=reporter, publisher=PLick).
   - 홈: `Organization` + `WebSite`.
   - 팀 허브: `CollectionPage` 또는 `ItemList`.
   - Schema.org Validator·리치 결과 테스트로 검증.
4. 동적 OG 이미지 — `next/og`(ImageResponse)로 기사별 1200x630 생성: 팀 컬러 배경 + 기사
   제목 + 루머 단계 배지. imageUrl 전건 null인 데이터 공백을 디자인으로 메꾸는 접근.
5. 시맨틱 마크업 점검 — 기사 상세 `<article>`, 목록 `<main>`/`<nav>`, 릴 카드의 heading 구조.
   현재 h1은 있으니 전면 재작업이 아니라 감사 수준.
6. 캐시 전략 — 기사 상세에 `revalidate` 도입 검토(루트 레이아웃의 쿠키 읽기와의 충돌 정리
   필요). 크롤러 응답 속도는 랭킹 요소인 Core Web Vitals와 직결된다.

### Step 3. 콘텐츠·운영 (쌓기 게임)

1. 서비스 소개 콘텐츠 보강 — G2("plick" 검색 시 서비스 소개)를 위해 홈 또는 `/about`에
   서비스가 뭔지 설명하는 크롤러블 텍스트 섹션. 현재 홈은 피드뿐이라 "PLick이 무엇인가"를
   설명하는 문장이 사이트 어디에도 없다.
2. thin content 완화 — BE와 `summary` 확장(문단 수) 또는 관련 루머 타임라인 병합 표시 논의.
   프론트 단독으로는 관련 기사 내부 링크 강화(이미 관련 기사 API 사용 중)로 페이지 가치를 높인다.
3. Core Web Vitals 측정·개선 — 배포 후 PageSpeed Insights로 LCP(2.5s)·CLS(0.1)·INP(200ms)
   측정. 폰트 preload·`font-display: swap`, 이미지 `next/image` 전환(현재 `images` 설정 없음),
   릴스 캐러셀 JS 경량화가 후보.
4. 백링크 — GitHub README에 서비스 링크, 팀원 기술 블로그(이 저장소 ADR들이 소재)에
   서비스 링크 포함, 축구 커뮤니티에서의 자연 유입. 특강 원칙: 좋은 콘텐츠에 링크는 따라온다.
5. 운영 사이클(월 1회) — Search Console 검색어·노출·클릭 확인 → "노출은 되는데 클릭이 안 되는"
   키워드 발견 → title/description 수정, 콘텐츠 보강 → 대기. GA4로 유입 후 행동(체류·전환) 추적.
   특강: 이 사이클을 월 1회만 돌려도 6개월 후 검색 유입이 완전히 달라진다.

## 5. 측정과 성공 기준

| 시점    | 기대 상태                                | 확인 도구                              |
| ------- | ---------------------------------------- | -------------------------------------- |
| 1주차   | sitemap 등록, 크롤링 시작                | Search Console 사이트맵·크롤 통계      |
| 2~4주차 | 색인 시작, "plick" 검색 시 노출          | Search Console 색인 생성, `site:` 검색 |
| 1~3개월 | 브랜드 검색어 1위, 기사 롱테일 노출 시작 | Search Console 실적(검색어별 순위)     |
| 3~6개월 | 팀 검색어 1페이지 진입, 안정적 자연 유입 | Search Console + GA4 유입 경로         |

KPI는 Search Console의 노출수·클릭수·평균 순위(팀 키워드 6종 + 브랜드 키워드), GA4의
organic 유입 세션수로 잡는다.

## 6. 리스크와 미결 사항

1. 도메인 canonical 결정(Step 0-1)은 팀 합의가 필요하다. 잘못 정하면 나중에 301 대이동이 필요하다.
2. env가 빌드 타임에 굳는 배포 특성상 `NEXT_PUBLIC_SITE_URL` 오설정 시 canonical·sitemap이
   통째로 잘못된 도메인을 가리킨다. 배포 체크리스트에 추가해야 한다.
3. 선수 검색어(G1의 절반)는 도메인에 선수 데이터가 없어 프론트 단독으로 완결할 수 없다.
   BE에 선수 태그(인물 태그) 로드맵을 요청하는 게 선행 과제다.
4. 릴스 무한스크롤 특성상 `/reels` 자체는 색인 가치가 낮다. 개별 릴 URL(Step 2-1)과 기사
   상세가 색인을 담당하고 `/reels`는 탐색 진입점으로 두는 역할 분리를 유지한다.
5. "프리미어리그"·"PL" 같은 핵심 키워드 최상단은 단기간에 불가능하다. 특강의 단계 모델대로
   롱테일 → 연관 → 핵심 순서로 가되, 이해관계자 기대치를 이 문서의 1절 표로 정렬해 둔다.

## 7. 다음 작업 (티켓 분할 제안)

- KAN-미정: Step 0 결정 + `NEXT_PUBLIC_SITE_URL` 도입 + OG 기본 이미지
- KAN-미정: Step 1 일괄(robots, sitemap, 메타데이터, canonical) — mobile·web
- KAN-미정: Search Console·네이버 서치어드바이저 등록 (운영, 코드 밖)
- KAN-미정: `/reels/[postId]` 신설 + 공유 링크 분기
- KAN-미정: `/teams/[slug]` 팀 허브
- KAN-미정: JSON-LD + 동적 OG 이미지
- KAN-미정: 서비스 소개 섹션(`/about` 또는 홈)
- 이후: Core Web Vitals, 운영 사이클 정착

## 참고

- 특강 자료: `[소마특강] SEO 전략.pdf` (강준혁, (주)산군)
- 현황 조사 상세: [ADR 0069](adr/0069-seo-strategy-plan.md)
- 관련 문서: [ADR 0047 공유 링크 다이얼로그](adr/0047-share-link-dialog.md),
  [ADR 0059 EC2 배포](adr/0059-mobile-ec2-deploy.md), [deploy-v2.md](deploy-v2.md),
  [handoff.md](handoff.md) §라우팅(원설계의 `/reels/[postId]`·OG 메타)
