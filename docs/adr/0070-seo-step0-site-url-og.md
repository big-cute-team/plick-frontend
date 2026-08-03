# 0070. SEO Step 0 — canonical 도메인 결정, NEXT_PUBLIC_SITE_URL 도입, OG 기본 이미지 (KAN-346)

2026-08-03. [SEO 전략 계획](../seo-strategy.md)(KAN-345)의 Step 0을 실행한 세션이다.
코드보다 결정이 절반인 티켓이라, 무엇을 왜 그렇게 정했는지를 중심으로 남긴다.

## 뭘 하는 티켓이었나

전략 문서의 Step 0은 "개발 전 합의가 필요한 선결 결정" 세 가지다.

1. 대표(canonical) 도메인을 `plick.co.kr`과 `m.plick.co.kr` 중 어느 쪽으로 할지
2. `NEXT_PUBLIC_SITE_URL` 환경변수 도입
3. OG 기본 이미지(1200x630) 제작

Step 1(robots, sitemap, 메타데이터)은 다음 티켓이고, 여기서는 그 기반만 깐다.

## 결정 1. canonical은 plick.co.kr (A안)

전략 문서에 적어둔 대로 고민 지점은 이거였다. 구글은 2019년부터 모바일 우선 인덱싱이라
모바일 웹이 주력인 PLick은 `m.plick.co.kr`이 자연스러워 보인다. 그런데 모바일 우선
인덱싱은 "크롤러가 모바일 화면 기준으로 평가한다"는 뜻이지 "모바일 도메인을 대표로
삼으라"는 뜻이 아니다. 구글의 별도 모바일 URL(separate URLs) 패턴은 오히려 반대로,
데스크톱 URL을 canonical로 두고 모바일 페이지가 데스크톱을 canonical로 가리키게 하는
구조를 표준으로 안내한다(데스크톱에 `rel="alternate" media="..."`, 모바일에
`rel="canonical"`). 여기에 m-dot 서브도메인보다 apex 도메인이 브랜드 검색과 백링크
축적에 유리하다는 일반론까지 겹쳐서, A안(`plick.co.kr` canonical)으로 확정했다.

잘못 정하면 나중에 301 대이동이 필요한 결정이라 사용자 확인을 받고 진행했다.
실제 canonical 태그와 alternate 상호 선언을 심는 건 Step 1(다음 티켓)이다.

## 결정 2. NEXT_PUBLIC_SITE_URL — 왜 다시 도입하나, 어디에 어떻게 박히나

[ADR 0047](0047-share-link-dialog.md)에서 공유 링크용으로 `NEXT_PUBLIC_SITE_URL`을
도입하려다 접고 `window.location.origin`으로 간 적이 있다. 공유 링크는 브라우저에서
만들어지니 현재 origin을 읽으면 끝이고, 환경변수를 늘리면 오설정 리스크만 생긴다는
판단이었다. 그 판단은 그대로 유지한다.

문제는 metadataBase·canonical·sitemap이다. 이건 서버가 빌드·렌더 시점에 "우리 사이트의
대표 절대 URL"을 알아야 하는데, 서버에는 window가 없다. 요청 헤더의 Host를 읽는 방법도
있지만 ALB 뒤에서 헤더가 어떻게 오는지에 의존하게 되고, sitemap처럼 요청 문맥 밖에서
생성되는 것도 있다. 결국 환경변수가 정공법이라 재도입했다.

어디에 값이 사는지가 이 저장소 배포 구조에서는 좀 특이해서 정리해 둔다.

- 로컬: 각 앱 `.env.local`·`.env.example`에 `http://localhost:3001`(mobile),
  `http://localhost:3000`(web).
- 배포: deploy.yml의 앱별 빌드 스텝에 상수로 박았다(web `https://plick.co.kr`,
  mobile `https://m.plick.co.kr`).
- turbo.json `globalEnv`에도 등록했다. Turborepo는 여기 등록된 env가 바뀌면 빌드
  캐시를 무효화한다. 빼먹으면 env를 바꿔도 캐시된 산출물이 나올 수 있다.

배포 값을 GitHub 시크릿이 아니라 워크플로 상수로 둔 이유는 두 가지다. 첫째, 공개
도메인이라 비밀이 아니다. 둘째, 전략 문서의 리스크 2번이 "오설정 시 canonical·sitemap이
통째로 잘못된 도메인을 가리킨다"였는데, 시크릿은 값이 안 보여서 오설정을 리뷰로 못
잡는다. 워크플로에 평문으로 있으면 PR 리뷰에서 눈으로 검증된다.

`NEXT_PUBLIC_` 접두사의 의미도 짚고 간다. Next는 빌드할 때 `NEXT_PUBLIC_`으로 시작하는
env를 클라이언트·서버 번들 양쪽에 리터럴로 인라인한다. 즉 이 값은 `API_BASE_URL`처럼
빌드 시점에 산출물로 굳고, 런타임에 SSM Parameter Store의 .env를 바꿔도 반영되지
않는다. 그래서 SSM 파라미터에는 넣지 않았고, deploy-v2.md에 이 제약을 병기했다.
도메인이 바뀌면 deploy.yml을 고치고 재배포해야 한다.

사실 서버 전용 용도면 접두사 없는 `SITE_URL`로 두고 런타임에 읽는 게 유연했겠지만,
전략 문서(KAN-345)가 이미 `NEXT_PUBLIC_SITE_URL`로 합의를 봤고, 값이 도메인 단위로
바뀌는 일 자체가 드물어서 빌드 타임 고정의 실익(리뷰 가능성, 이름의 관례성)을 택했다.

이번 티켓에서는 변수 도입까지만 하고 소비처는 만들지 않았다. metadataBase에 물리는 건
Step 1이다.

## 결정 3. OG 기본 이미지 — 코드로 만들었다

1200x630 브랜드 이미지 한 장이 필요했다. 발행 기사의 `imageUrl`이 전건 null이라 기사
이미지를 OG로 쓰는 전략이 데이터상 성립하지 않고, Step 2의 기사별 동적 OG(`next/og`)
전까지 모든 페이지가 이 기본 이미지를 쓴다.

피그마에서 그려서 png로 뽑아올 수도 있었지만 코드 생성을 택했다. 브랜드 색이 토큰
(`packages/tokens/theme.css`)에 있고 워드마크 벡터가 `@plick/ui` `Logo.tsx`에 있으니,
그 둘을 그대로 읽어 SVG를 조립하면 디자인 자산과 어긋날 일이 없다. 문구가 바뀌면
스크립트만 다시 돌리면 된다. 스크립트는 `scripts/og-image/render.mjs`로 커밋했다.

### 렌더링 시행착오

처음엔 프로젝트 node_modules에 이미 있는 sharp(libvips)로 SVG를 래스터라이즈하려
했다. 그런데 SVG 안의 한글 `<text>`가 문제다. libvips의 텍스트 렌더링은 fontconfig로
시스템 폰트를 찾는데, 맥에 Pretendard가 설치돼 있다는 보장이 없고 폴백이 뭐가 될지도
런타임마다 다르다. 산출물이 환경에 따라 달라지는 스크립트는 만들고 싶지 않았다.

satori(JSX → SVG, 폰트 임베드)도 후보였지만 woff2를 못 읽고 ttf/otf가 필요했다. 결국
`@resvg/resvg-js`로 갔다. resvg는 `fontFiles` 옵션으로 폰트 파일을 명시적으로 주입할
수 있고 `loadSystemFonts: false`로 시스템 폰트를 아예 끊을 수 있어서, 어느 머신에서
돌려도 같은 픽셀이 나온다. 워드마크는 이미 path라 폰트가 필요 없고, 태그라인 텍스트만
Pretendard SemiBold otf(앱이 CDN으로 쓰는 것과 같은 1.3.9)를 받아서 넣었다.

폰트 다운로드에서도 한 번 막혔다. jsdelivr 경로를 `dist/public/static/...`으로
짐작했는데 404가 났다(받은 파일이 103바이트 에러 텍스트였다. curl은 404여도 파일을
만드니 `file` 명령으로 확인하는 습관이 필요하다). jsdelivr의 파일 목록 API는 패키지가
50MB를 넘는다고 403을 뱉어서, GitHub API로 리포 트리를 뒤져 실제 경로가
`packages/pretendard/dist/public/static/Pretendard-SemiBold.otf`인 걸 찾았다.
모노레포 전환 때 경로가 바뀐 모양이다.

디자인은 다크 토큰 배경(#0b0d12) 위에 워드마크(텍스트 #eef2f8 + i 점 accent #2fd97f)를
크게 놓고, 아래 태그라인(#93a0b4), 뒤에 accent 라디얼 글로우를 아주 옅게 깔았다.
1.2MB짜리 폰트는 커밋하지 않고 README에 받는 법을 적었다. 산출물 png(53KB)만 커밋한다.

### 배치 — public/이 아니라 app/에 둔 이유

산출물을 `apps/{mobile,web}/app/opengraph-image.png`로 뒀다. Next의 파일 기반 메타데이터
컨벤션인데, `app/` 루트에 이 이름으로 파일이 있으면 Next가 알아서 `<meta property="og:image">`
태그를 만들어 전 라우트에 상속시키고, 이미지는 해시 붙은 정적 라우트로 서빙한다.
`opengraph-image.alt.txt`를 옆에 두면 `og:image:alt`도 같이 나간다.

`public/`에 두고 레이아웃 메타데이터에 수동으로 적는 방법과 비교하면 이 방식이 우리
배포 구조에서 이점이 하나 더 있다. standalone 산출물은 `public/`을 자동 포함하지 않아
배포 워크플로의 수동 복사 스텝에 의존하는데(ADR 0059, 전략 문서 리스크 5번), `app/`의
파일 기반 메타데이터는 라우트로 컴파일되어 `.next` 산출물 안에 들어가므로 그 복사
스텝과 무관하게 동작한다.

메타데이터 태그 자체(og:title 등 나머지)와 metadataBase 연결은 Step 1에서 마저 한다.
지금 상태로도 두 앱 모든 페이지에 og:image와 og:image:alt는 나간다.

## 태그라인 교체

OG 이미지에 넣을 문구를 정하다가 태그라인 자체가 바뀌었다. 기존 메타데이터 description
"오늘의 PL 루머를 한 장에"는 카드 UI 시절 문구라, 사용자 결정으로
"프리미어리그 소식을 릴스로"로 확정했다(중간에 "프리미어리그 이적 루머를 릴스로"를
거쳐 최종 확정). 두 앱 layout.tsx의 description, OG 이미지, alt 텍스트를 전부 이
문구로 통일했다. 코드에서 옛 문구를 쓰는 곳은 메타데이터뿐이었고, 로그인·회원가입
카드의 문구("축구 이적 뉴스, 팬 반응까지 한 번에" 등)는 화면 전용 카피라 두었다.

## 후속: 파비콘 세트 (같은 세션)

PR을 올리고 나서 파비콘도 이 티켓에서 같이 가기로 했다. 기존에는 create-next-app이
만들어 준 기본 `favicon.ico`가 그대로 살아 있었다.

원본은 사용자가 피그마에서 내보낸 520x520 SVG다(다크 원형 배경 + 흰 워드마크).
처음에 16x16으로 뽑으면 되냐고 물어 와서 반대로 가야 한다고 정리했다. 작은 크기를
원본으로 삼으면 그게 해상도 상한이 되어 512·180으로 키울 때 다 뭉개진다. 벡터(SVG)
하나를 크게 받고 작은 크기들은 스크립트가 다운스케일로 만든다.

받은 SVG에서 한 가지 손봤다. i 점이 `#12A968`(라이트 테마 accent)로 나왔는데 앱은
다크 고정이고 OG 이미지도 다크 accent(`#2fd97f`)를 쓰므로 색만 바꿔치기했다. 피그마
원본 컴포넌트가 라이트 기준으로 그려져 있는 모양이라, 다시 내보낼 일이 생기면 점
색을 확인해야 한다(scripts/favicon/README.md에 적어 뒀다).

산출물은 OG 이미지와 같은 이유로 `app/` 파일 컨벤션에 뒀다. Next는 `app/` 루트의
`icon.png`·`apple-icon.png`·`favicon.ico`를 자동으로 라우트로 만들고 `<link rel="icon">`
`<link rel="apple-touch-icon">` 태그를 심어 준다. standalone의 `public/` 복사 스텝과도
무관하다.

- `icon.png`(512): 원형 그대로, 모서리 투명. 브라우저가 알아서 줄여 쓴다.
- `apple-icon.png`(180): iOS는 투명 배경을 검게 칠해 버려서 다크 토큰 배경(#0b0d12)을
  정사각으로 깔아 합성했다. 원본 SVG 문자열 앞에 `<rect>` 하나를 끼워 넣는 방식이다.
- `favicon.ico`(16+32): 구형 브라우저와 ico를 직접 찾는 크롤러 몫. 여기서 삽질이
  하나 있었는데, ICO 컨테이너에 PNG를 넣는 건 규격상 256px 엔트리만 보장이라
  전통적인 BMP(DIB) 엔트리를 스크립트가 직접 조립했다. BMP는 픽셀이 상하 반전에
  BGRA 순서로 저장되고, 높이 필드를 AND 마스크 몫까지 두 배로 적는 옛 규격이라
  resvg가 준 RGBA 버퍼를 그 모양으로 뒤집어 채웠다.

스크립트는 `scripts/favicon/render.mjs`로 커밋했다. 검증은 빌드 라우트에
`/icon.png`·`/apple-icon.png`가 잡히는 것과, dev 서버 head에서 세 link 태그가 전부
200으로 서빙되는 것까지 확인했다. 16px에서 다섯 글자 워드마크가 얼마나 읽힐지는
걱정이 남는데, 실제 탭에 걸어 보고 뭉개지면 P + 점만 남긴 심볼 변형을 후속으로
검토한다.

## 남긴 것

- 다음 티켓(Step 1): robots.ts, sitemap.ts, 루트 메타데이터 보강(metadataBase에
  `NEXT_PUBLIC_SITE_URL` 연결, title.template, openGraph·twitter 기본값), 기사 상세
  generateMetadata, canonical + m-dot 상호 선언.
- OG 이미지가 아직 어색하면 문구·레이아웃은 `scripts/og-image/render.mjs`에서 조정.
- 관련: [seo-strategy.md](../seo-strategy.md), [ADR 0069](0069-seo-strategy-plan.md),
  [ADR 0047](0047-share-link-dialog.md), [ADR 0059](0059-mobile-ec2-deploy.md),
  [deploy-v2.md](../deploy-v2.md) §4
