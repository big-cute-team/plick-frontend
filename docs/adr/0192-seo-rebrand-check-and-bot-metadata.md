# 0192. 리브랜딩 뒤 SEO 전수 점검, 봇 메타 스트리밍 막기, FAQ 구조화 데이터, llms.txt (KAN-623)

## 어떻게 시작됐나

KAN-623 티켓은 세 줄이었다. llms.txt 설정, application/ld+json 설정, robots.txt에 `/`는 allow하고 `/api`는 disallow하는 형식. 사용자는 이 티켓을 손에 들고 "리브랜딩에 맞춰 전부 돼 있는지, 사이트맵은 다시 제출해야 하는지" 한 번 짚고 가자고 했다. 그래서 티켓 세 줄을 체크하는 대신 prod 두 호스트(`plick.co.kr`, `m.plick.co.kr`)를 실제로 받아 보며 SEO 표면 전체를 훑는 것부터 했다.

점검은 코드 대신 curl로 했다. 저장소에 무엇이 있는지는 나도 알지만 배포된 HTML이 그걸 그대로 내는지는 별개다. 홈, 기사 상세, 팀 허브, 릴 세부, 투표, FAQ, 약관, 개인정보처리방침, LIVE, MY, 로그인, 인물, 이슈 페이지를 Googlebot UA로 받아 title, description, canonical, alternate, og:_, twitter:_, JSON-LD, 아이콘 링크를 뽑았다. robots.txt, sitemap.xml, manifest.webmanifest, 정적 OG 이미지, 파비콘 세트, dev 두 호스트의 noindex, http와 www 리다이렉트도 봤다.

## 리브랜딩은 빠진 게 없었다

결과부터 쓰면 사용자에게 보이는 표면은 전부 해축이모였다. title, description, og:site_name, twitter 카드, JSON-LD의 Organization name과 publisher, 매니페스트 name과 short_name, OG 이미지 1200x630, 파비콘과 아이콘 세트 전부. prod HTML을 대소문자 구분으로 긁어 "PLick"과 "플릭"을 찾았더니 0건이었다. 문구 출처가 `@plick/domain/brand` 하나라 KAN-567에서 그 파일을 바꾼 것이 전부 따라왔고, 이미지는 KAN-583에서 새 로고로 다시 그린 상태였다.

남은 잔존은 코드 주석 두 줄이었다. 두 앱 루트 레이아웃의 메타데이터 주석이 "template이 … | 플릭 PLick으로 감싼다"고 설명하고 있었다. 노출은 안 되지만 현재 동작을 틀리게 적은 주석이라 고쳤다. `format.ts`의 "… | PLick을 손으로 복제하다 어긋났다"는 과거 버그를 기록한 문장이라 그대로 뒀다.

## 사이트맵은 다시 제출할 필요가 없다

사용자 질문 중 하나가 이거였다. 답은 "필요 없다"다. 두 사이트맵은 ADR 0071에서 `force-dynamic`으로 만들어 요청마다 BE를 걸어 새로 만들어진다. URL은 하나도 바뀌지 않았고(도메인은 plick을 유지한다), 당일 받아 보니 web 3,722개, mobile 1,870개 URL이 그날 오후 기사까지 들어가 있었다. Search Console은 등록된 사이트맵을 주기적으로 다시 읽으므로 다시 제출해도 "다시 읽어라"는 신호 이상의 효과는 없다.

대신 리브랜딩 결과가 검색 결과에 반영되는 속도는 다른 데서 결정된다. 구글이 홈을 다시 크롤해 새 title과 description, 사이트명을 받아야 하고, 파비콘도 홈 재크롤 때 갱신된다. 그래서 운영 작업으로 Search Console URL 검사에서 홈과 팀 허브 6개 색인 요청, 네이버 서치어드바이저에서 두 호스트 홈 수집 요청을 권했다. 코드 밖이라 사용자 몫이다. 구글 한국 검색 결과에 아직 옛 제목이 뜨는지는 내가 확인할 수 없었다. 미국 검색 엔진에서는 두 도메인이 아예 잡히지 않았다.

## 점검에서 나온 문제 여섯 개

1. 라이브 중단 화면이 사이트맵에 그대로 있다. KAN-644(ADR 0191)가 `/live`, `/live/standings`, `/teams/*/profile`을 프록시에서 "LIVE 준비 중"으로 rewrite하는데, 그 페이지에 noindex도 canonical도 없고 사이트맵은 그 URL들을 계속 싣는다. 크롤러가 같은 안내문을 여덟 URL로 받아 간다.
2. 메타 태그가 body로 흘러가는 봇이 있다. 아래에 따로 쓴다.
3. canonical 상호 선언이 빠진 페이지. FAQ, 약관, 개인정보처리방침은 두 앱 모두 canonical이 없어 같은 내용이 두 도메인에 따로 선다. 모바일 인물 페이지는 웹이 alternate로 가리키는데 모바일이 canonical을 되돌리지 않아 한쪽만 선언된 상태였다.
4. 두 앱 사이트맵이 서로 어긋난다. canonical 도메인인 web 사이트맵에 `/teams/*/profile`이 없고(모바일에만 있다), 모바일에는 `/debates`가 없다(웹에만 있다). 안내 페이지 세 개는 양쪽 다 없다.
5. JSON-LD가 홈, 기사, 팀 허브에만 있다. FAQ는 FAQPage를 달기 좋은 자리인데 비어 있다.
6. `www.plick.co.kr`은 DNS가 해석되지 않는다.

사용자는 1번을 그대로 두자고 했다. 라이브는 곧 다시 열 거라 noindex를 걸었다 떼는 왕복이 더 번거롭다는 판단이다. 6번은 DNS 작업이라 이 PR 밖이다. 나머지를 이 브랜치에서 했다.

## 메타 태그가 head 밖으로 나가는 봇

Lighthouse 감사(KAN-641)에서 기사 상세만 SEO 92점이고 원인이 "description이 head에 없다"였다. 10월 11일 감사 문서에는 "크롬 UA에는 body에, curl 기본 UA에는 head에 있다"고만 적혀 있었는데, 이번에 UA별로 다시 재 보았다.

Next 15.2부터 `generateMetadata`가 비동기인 라우트는 메타 태그를 기다리지 않고 셸을 먼저 보낸다. 그러면 title, description, canonical, og:\*가 `<head>`가 아니라 `<body>` 끝에 `<script>`와 함께 붙어 내려오고, 브라우저가 그걸 실행해 head로 옮긴다. 이걸 스트리밍 메타데이터라고 부른다. 느린 BE를 기다리는 동안 첫 바이트를 먼저 내보내는 최적화인데, HTML을 한 번 받아 `<head>`만 파싱하는 프로그램은 그 태그를 못 본다. Next도 이걸 알아서 `htmlLimitedBots`라는 정규식에 맞는 UA에는 메타를 기다려 head에 넣어 준다. Googlebot은 JS를 실행하는 봇이라 일부러 그 목록에서 빼 두었다.

prod 기사 상세 하나를 다섯 UA로 받아 `</head>` 위치와 description 위치를 비교했다. Googlebot, Yeti(네이버), facebookexternalhit은 head였다. 일반 크롬 UA와 `kakaotalk-scrap`은 body였다. 카카오톡 공유 미리보기 스크래퍼가 기본 목록에 없다는 뜻이다. 모바일 기사 상세는 Googlebot UA에서도 한 번 body로 왔는데, 이건 BE 캐시가 식어 메타데이터 해석이 셸보다 늦었을 때 스트리밍이 걸린 것이고 Googlebot은 어차피 렌더해서 읽으니 문제가 아니다.

Next 16.2의 기본 목록을 `node_modules/next/dist/shared/lib/router/utils/html-bots.js`에서 열어 봤다. 구글 계열, Lighthouse, Bing, 야후, 덕덕고, 바이두, 얀덕스, 애플, 페이스북, 트위터, 링크드인, 슬랙, 디스코드, 왓츠앱, 스카이프, Yeti다. 카카오톡과 다음이 없고, GPTBot, ClaudeBot, PerplexityBot 같은 AI 크롤러도 없다. AI 크롤러는 JS를 실행하지 않고 HTML을 그대로 읽는다. 티켓 1번이 llms.txt인데, AI 검색 노출에 더 직접 닿는 건 이쪽이라고 판단했다. description과 JSON-LD를 head에서 받지 못하는 크롤러에게 llms.txt를 줘 봐야 반쪽이다.

`htmlLimitedBots` 설정에는 함정이 하나 있었다. 기본 목록에 합쳐지는 게 아니라 대체된다. `server/config.js`를 보면 사용자가 RegExp를 넘기면 그 `source`를 쓰고, 안 넘겼을 때만 기본 문자열을 채운다. 카카오톡 하나 넣으려고 `/kakaotalk-scrap/`만 적으면 Yeti와 페이스북이 스트리밍으로 떨어진다. 그래서 기본 목록을 통째로 복사하고 뒤에 덧붙이는 공용 상수를 만들었다.

위치는 `packages/core/src/html-limited-bots.mjs`다. `next.config.js`가 빌드 시점에 import하는 파일이라 TS일 수 없어 `.mjs`로 두었고, core 패키지 exports에 `./html-limited-bots` 항목을 하나 추가했다(`./*`는 `.ts`로만 매핑된다). 두 앱 config가 같은 상수를 import한다. 덧붙인 봇은 kakaotalk-scrap, Daum, Line, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot과 Claude 계열, anthropic-ai, PerplexityBot, Perplexity-User, CCBot, Bytespider, Amazonbot, meta-externalagent다. 텔레그램도 넣었다가 뺐다. 실제 UA가 "TelegramBot (like TwitterBot)"이라 기본 목록의 Twitterbot에 걸린다는 걸 테스트가 잡아 줬다.

복사한 기본 목록이 Next 버전을 따라가지 못하는 게 이 방식의 위험이다. 그래서 단위 테스트가 설치된 Next의 `HTML_LIMITED_BOT_UA_RE`를 직접 import해 토큰을 하나씩 대조한다. Next를 올렸을 때 기본 목록이 늘면 테스트가 깨지고 어떤 토큰이 빠졌는지 말해 준다. 덧붙인 UA 샘플이 기본 목록에는 안 걸리고 우리 목록에는 걸리는지, 브라우저와 Googlebot은 여전히 안 걸리는지도 본다.

검증은 로컬 web dev 서버를 prod BE로 띄워 기사 상세를 다시 받았다. kakaotalk-scrap, GPTBot, ClaudeBot, Yeti는 description, canonical, og:image 전부 head였고 크롬 UA는 그대로 body였다. 의도한 대로다.

## FAQ 문안을 데이터로 내리고 FAQPage를 달았다

FAQ 문안은 `@plick/ui`의 `FaqBody` 안에 ReactNode 배열로 있었다. 답변 하나에 `<a href="/privacy">` 링크가 들어 있어서 그렇게 두었던 것이다. FAQPage JSON-LD는 `Answer.text`를 평문으로 요구하니 그 ReactNode에서 글자를 뽑을 수가 없다.

데이터를 `@plick/domain/faq`로 내렸다. 답변은 조각 배열이고 조각은 평문 문자열이거나 `{ text, href }` 링크다. `FaqBody`는 조각을 돌며 링크면 `<a>`로, 아니면 글자 그대로 그린다. `faqAnswerText`는 조각의 글자만 이어 붙인다. 화면과 구조화 데이터가 같은 배열을 읽으니 문안이 어긋날 길이 없다. `&gt;`와 `&apos;`로 이스케이프했던 글자는 데이터에선 그냥 `>`와 `'`다. React가 텍스트 노드로 넣을 때 알아서 처리한다.

`faqPageJsonLd({ url })`를 `@plick/domain/jsonld`에 추가하고 두 앱 FAQ 페이지에 `JsonLd`로 심었다. 모바일도 canonical 도메인 URL(`WEB_SITE_URL/faq`)을 넘긴다. 홈의 Organization과 같은 규약이다.

솔직하게 적어 두면, 구글은 2023년부터 정부·의료 사이트가 아니면 FAQ 리치 결과를 보여 주지 않는다. 검색 결과 모양은 바뀌지 않을 것이다. 그래도 "해축이모는 어떤 서비스인가"를 묻는 AI 검색이 본문 파싱 없이 질문과 답을 가져갈 수 있고, 비용이 빌더 하나라 달았다.

## canonical과 사이트맵 보강

FAQ, 약관, 개인정보처리방침에 web은 `canonical: "/faq"` + 모바일 alternate, mobile은 `canonical: WEB_SITE_URL/faq`를 달았다. 로그인 페이지가 KAN-346에서 쓴 패턴 그대로다. 모바일 인물 페이지의 `generateMetadata`에도 `WEB_SITE_URL/figures/{id}` canonical을 넣어 웹 쪽 alternate 선언과 짝을 맞췄다.

사이트맵은 web에 팀 프로필 6개(weekly 0.5)와 안내 페이지 3개(monthly 0.3)를, mobile에 `/debates`(daily 0.6)와 안내 페이지 3개를 더했다. 로그인과 회원가입은 색인 가치가 없어 넣지 않았다. 팀 프로필은 지금 라이브 중단으로 준비중 화면이 뜨는 URL이지만 사용자 판단대로 그대로 실었다. 인물과 선수 프로필은 200명이 넘고 대부분 관련 기사가 없어 모바일 사이트맵 주석의 판단을 유지했다.

## llms.txt

`/llms.txt`는 AI 어시스턴트가 사이트를 요약할 때 읽으라고 두는 마크다운 안내문이다(llmstxt.org 제안). 구글 검색은 읽지 않는다. 기대치는 낮게 두고 라우트 하나로 만들었다.

본문은 `@plick/domain/llms`의 `llmsTxt({ siteUrl, canonicalSiteUrl })`가 만든다. 브랜드와 description, 주요 페이지 4개, 팀 허브 6개, 기사 URL 패턴과 사이트맵 링크, FAQ 질문과 답 전부, 안내 페이지 3개다. 모바일은 자기 호스트 URL로 같은 틀을 내고 canonical이 데스크톱이라는 문장이 바뀐다.

`public/llms.txt`로 두지 않은 이유가 둘이다. 배포가 `public/`을 CDN과 standalone에 따로 복사하는 스텝에 기대고 있고(ADR 0059), 사이트 URL이 dev와 prod에서 달라 정적 파일로는 둘 수 없다. `app/llms.txt/route.ts`에 `force-static`을 걸면 빌드 시점에 `NEXT_PUBLIC_SITE_URL`이 박힌 채 정적으로 굳고, 폴더 이름에 점이 있어 proxy matcher(확장자 포함 경로 제외)도 타지 않는다. 빌드 출력에 두 앱 모두 `○ /llms.txt`로 잡혔다.

## 검증

- `pnpm format:check`, `pnpm lint`, `pnpm check-types`, `pnpm test:hooks`, `pnpm test:unit`(79건, 신규 7건), `pnpm build` 통과
- 로컬 web(:3000, prod BE)과 mobile(:3001, prod BE) dev 서버에서 `/llms.txt` 200 text/plain, `/faq`의 canonical·alternate·FAQPage JSON-LD, `/terms`·`/privacy` canonical, 모바일 `/figures/1` canonical, 두 사이트맵의 새 항목을 curl로 확인
- 기사 상세를 UA 다섯 개로 받아 kakaotalk-scrap, GPTBot, ClaudeBot, Yeti는 head, 크롬은 body인 것을 확인

## 남은 것

- Search Console 홈·팀 허브 색인 요청, 네이버 두 호스트 수집 요청. 코드 밖 운영 작업이다
- 라이브 중단 화면의 noindex는 일부러 두지 않았다. 중단이 길어지면 다시 본다
- `www.plick.co.kr` DNS 레코드와 apex 리다이렉트
- 인물·선수·이슈 페이지 사이트맵 수록은 BE에 목록 API가 생기면 본다
- Next 버전을 올릴 때 `html-limited-bots` 테스트가 깨지면 기본 목록을 따라 맞춘다
