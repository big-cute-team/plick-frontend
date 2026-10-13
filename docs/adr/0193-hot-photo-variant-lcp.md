# 0193. 핫이슈 사진을 카드 크기 변형으로 받아 홈·팀 허브 LCP 줄이기 (KAN-624)

## 어떻게 시작됐나

10월 11일 prod 모바일 전 화면을 Lighthouse로 재고(`docs/audits/2026-10-11-lighthouse-prod-mobile.md`) 아홉 개 티켓을 만들었는데, 그중 성능 점수를 가장 많이 깎는 게 KAN-624였다. 18개 화면 가운데 홈(성능 70, LCP 9.9초)과 팀 허브(64, 8.1초)가 꼴찌 둘이고, 두 화면 다 LCP 요소가 핫이슈 첫 카드의 트윗 사진이다. LCP(Largest Contentful Paint)는 뷰포트 안에서 가장 큰 콘텐츠 조각이 그려진 시각이다. 구글 기준 2.5초 안이 좋음이고 4초를 넘으면 나쁨이다.

이번 세션은 블로그 글을 같이 쓰면서 진행했다. 문제 상황, 해결 방안 고민, 해결, 결과 순으로 글을 쌓아 가고 사진을 찍을 자리를 미리 정해 두는 식이다. 그래서 이 ADR도 그 순서를 따른다.

## 문제 상황

감사 리포트에서 홈 LCP를 단계별로 쪼개면 TTFB 0.6초, 로드 지연 1.5초, 로드 5.6초, 렌더 지연 2.2초다. 사진 다운로드 5.6초가 거의 전부다. 왜 오래 걸리나 보니 카드는 폰 화면 절반 폭(390px 기기에서 약 170×142 CSS px)인데 받는 사진은 트위터 원본에 `name=large`(최대 2048px)를 붙인 것이었다. 홈은 4장 777KiB, 팀 허브는 5장 1,372KiB를 받고, Lighthouse의 "이미지 크기 적절하게 설정하기" 항목은 각각 729KiB, 1,307KiB를 줄일 수 있다고 봤다. 받는 바이트의 90% 이상이 화면에 그려지지도 않고 버려지는 셈이다.

왜 이렇게 돼 있었는지 코드 이력을 따라가 봤다. `packages/core/src/tweet-media.ts`는 KAN-484에서 만든 것이다. BE가 핫이슈를 "원문 사진 있음/없음"으로 갈라 주는데 그 기준 컬럼(`raw_articles.media_url`)과 카드가 그리는 대표 이미지 컬럼(`article_summaries.image_url`)이 달라서, 사진 있는 그룹인데도 `imageUrl`이 비는 기사가 생겼다. 그 빈 칸을 원문 트윗의 사진으로 메우려고 react-tweet의 신디케이션 API를 서버에서 불러 `mediaDetails` 중 제일 큰 사진을 고르는 함수를 뒀다. 신디케이션이 주는 `media_url_https`는 크기 변형이 없는 원본 경로라 뭔가 붙여야 하는데, 그때 "제일 큰 판"이라는 뜻으로 `name=large`를 골랐다. 그 뒤 KAN-567·KAN-585에서 카드가 두 장씩 보이는 소형 카드로 바뀌었고, 사진 크기 변형은 그대로 남았다. 한편 릴 임베드 쪽 `apps/mobile/app/_utils/tweet.ts`의 `tweetImageUrl`은 KAN-422에서 preload용으로 만들면서 react-tweet 내부 규칙을 따라 `name=small`(680px)을 쓴다. 같은 저장소 안에 트윗 사진 크기 규칙이 두 벌 있는 상태였다.

트위터 CDN(`pbs.twimg.com`)의 사진 변형은 `name=` 쿼리로 고른다. `thumb` 150px 정사각, `small` 긴 변 680px, `medium` 1200px, `large` 2048px, `orig` 원본이다. 카드가 170 CSS px이면 DPR 3 기기에서도 510px이면 되니 `small`로 충분하다.

사용자가 데스크톱 크롬에서 찍은 사진 세 장이 이 상황을 그대로 보여 준다. Lighthouse "이미지 크기 적절하게 설정하기"에 "표시된 크기 234×234에 비해 1255×782로 너무 큼, 160.4KiB 중 151.5KiB 절감 가능"이 찍혔고, DevTools 요소 패널의 `<img>` 툴팁에는 "렌더링된 크기 228×142, 고유 크기 1179×852, 파일 189kB"가 나란히 나온다. 패널 Lighthouse 점수는 69점, LCP 7.9초였다. 데스크톱 웹(`apps/web`)도 같은 `withTweetPhotos`를 쓰니 같은 문제다.

### 개선 전 측정

코드를 건드리기 전에 같은 조건으로 재 둬야 전후 비교가 된다. 1회 측정은 TTFB 편차가 시뮬레이션에 증폭돼 같은 코드가 FCP 0.9초와 3.0초로 갈리는 걸 지난 감사에서 봤기 때문에 3회 중앙값을 쓴다. Lighthouse 12.8.2 CLI, 기본 모바일 프로파일(Moto G Power, 시뮬 4G, CPU 4배 감속), `--headless=new`, 비로그인.

측정 당일 핫이슈 카드는 3장이었다(감사 때는 4장). 홈 3회가 LCP 7.3·7.7·7.9초, 팀 허브가 8.1·7.6·7.5초로 중앙값은 홈 7.7초, 팀 허브 7.6초였다. 사진 전송량은 3장 955KiB, Lighthouse의 리사이즈 절감 추정은 974KiB다. 첫 카드 사진 하나가 1028×852 185KiB이고 표시 크기는 170×141이다. 런별 표는 `docs/perf/2026-10-13-kan-624-hot-photo/before.md`에 뒀다.

이번에 새로 눈에 띈 게 둘 있다. 하나는 Lighthouse 12의 "LCP breakdown" 인사이트가 스로틀링 없는 실측값을 따로 보여 주는데, 거기서도 리소스 로드 시간이 3.7초였다. 시뮬레이션 7.7초 중 로드 5.6~7.2초가 전부인 것과 같은 그림이고, 실제 기기에서도 사진 받는 데 3초 넘게 걸린다는 뜻이다. 다른 하나는 FCP가 런마다 1.0초와 3.0초로 갈리는 것이다. 코드는 같고 TTFB 편차가 시뮬레이션에 증폭된 것이라 지난 감사 때와 같다. 그래서 LCP 중앙값과 그 런의 로드 단계만 비교 대상으로 삼는다.

리포트 HTML에서 블로그에 넣을 자리를 Playwright로 잘라 PNG로 만들었다. Lighthouse 12 리포트는 기본이 "insights" 보기라 `#largest-contentful-paint-element` 같은 옛 감사 항목이 DOM에 없고, 하단 "Go back to audits" 버튼을 누른 뒤에야 나타난다. 처음 locator가 0개를 돌려줘서 한 번 헤맸다.

### 왜 `name=large`였나, 이력을 따라가 보니

블로그에 "원인 코드" 문단을 쓰려고 git 이력을 따라갔다. `name=large`는 2026년 9월 16일 KAN-484(ADR 0153)에서 들어왔다. 그때 사용자 요청은 "핫이슈 캐러셀에 이미지 없으면 임베드 보여주는데, 임베딩 된 거에서 실제 이미지만. 기자 이미지 아이콘 말고, 실제 큰 이미지만"이었다. 요청 문장에 "큰 이미지"가 들어 있었고, 신디케이션의 `media_url_https`는 크기 변형이 없는 원본 경로라 뭔가를 붙여야 했다. ADR 0153에는 "`?name=large`를 붙여야 큰 판이 온다"는 한 줄만 있고 왜 large인지의 판단은 없다. 그 시점 모바일 핫이슈는 한 장씩 넘어가는 전폭 히어로 캐러셀(KAN-282)이었다. 375px 기기에서 여백 빼고 335px, DPR 3이면 1005px이라 `medium`(1200px)이 맞는 크기였고 `large`도 그렇게 과하진 않았다.

그런데 바로 다음 날인 9월 17일 KAN-515(ADR 0155)에서 모바일 카드가 한 줄 두 장으로 바뀌었다. 폭이 `calc((100% - 10px)/2)`, 약 162px이 됐다. 사진 크기 변형은 `packages/core`에 있고 카드는 `apps/mobile`에 있어서 카드를 반으로 줄이는 작업에서 사진 쪽은 건드릴 이유가 없었다. 그 뒤 KAN-567 리디자인(168px 고정 폭)과 KAN-585(트랙 절반 폭)를 거치면서도 마찬가지였다. 카드 크기를 정하는 코드와 사진 크기를 정하는 코드가 서로 모르는 사이라, 한쪽이 네 번 바뀌는 동안 다른 쪽은 한 번도 안 바뀌었다.

한편 릴 임베드 쪽은 8월 31일 KAN-422(ADR 0113)에서 첫 릴의 트윗 사진을 preload하면서 react-tweet 내부 `getMediaUrl(media, "small")` 규칙을 그대로 옮겨 적었다. preload URL이 실제 렌더 URL과 한 글자라도 다르면 이중 다운로드가 되기 때문에 `name=small`을 고른 게 아니라 react-tweet이 쓰는 값을 따라간 것이다. 그래서 같은 저장소에 트윗 사진 크기 규칙이 둘이 됐다. 하나는 "제일 큰 판", 하나는 "react-tweet이 쓰는 판". 둘 다 각자 자리에서는 이유가 있었고 서로를 몰랐다.

트위터 CDN이 실제로 뭘 주는지도 받아 봤다. LCP 사진(`HUXzRRXXUAEspVd.jpg`)은 `thumb` 150×150 7KB, `small` 679×491 71KB, `medium`·`large`·`orig` 모두 1179×852 189KB였다. 원본이 1200px보다 작아서 medium 위로는 다 같은 파일이다. 홈에서 제일 컸던 사진(`HUbEjN_W0AACvLr.jpg`)은 `small` 510×680 65KB, `medium` 900×1200 209KB, `large` 1536×2048 544KB로 small과 large가 8.4배 차이 났다. 카드가 170 CSS px이면 DPR 3에서 510px이 필요한데 `small`의 긴 변이 680px이라 딱 들어간다.

## 해결 방안 고민

고를 게 세 가지였다. 어느 변형을 받을지, `srcset`을 달지, 규칙을 어디에 둘지.

### 어느 변형: small이면 된다

카드가 얼마나 큰 사진을 필요로 하는지부터 계산했다. 모바일 카드는 트랙 절반 폭이라 390px 기기에서 170 CSS px, 가장 넓은 폰(430px)에서도 190 CSS px이다. DPR 3이면 510~570px이 필요하다. 데스크톱 웹 카드는 1200px 컨테이너 3열이라 약 290 CSS px, DPR 2에서 580px이다. `small`은 긴 변 680px이니 세로 사진(510×680)이 데스크톱 레티나에서 14% 늘어나는 것 말고는 전부 1:1 이상이다. `medium`(1200px)은 어느 화면에서도 남는다.

실제 바이트로 확인했다. 홈 핫이슈 사진 3장을 변형별로 받아 보니 `large` 합계 968KB가 `small`에서 199KB(−79%)였다. `medium`은 545KB(−44%)라 어중간했다. 사진 하나(1번, 1179×852)는 원본이 1200px보다 작아 `medium`·`large`·`orig`가 전부 같은 189KB 파일이었다. 세 변형을 170×142 카드에 그려 나란히 놓으면 눈으로 구분이 안 된다.

`format=webp`도 받아 봤다. CDN이 주긴 하는데 `small`에서 jpg 199KB 대 webp 173KB로 13% 차이고, 사진에 따라 2%에서 30%까지 들쭉날쭉했다. 처음엔 "리사이즈가 79%를 가져가니 포맷은 다음에"로 적어 뒀는데, 사용자가 "이번에 webp로 다 바꾸는 게 낫지 않냐"고 되물었고 생각을 고쳤다. CDN이 공짜로 주는 거라 코드 비용이 0이고, 사진에 따라 30%까지 더 줄며, Lighthouse의 "최신 이미지 포맷" 감점도 같이 사라진다. 내가 jpg 유지 근거로 든 "릴 임베드와 브라우저 캐시 공유"는 같은 사진이 핫이슈와 릴 양쪽에 뜰 때만 60KB 아끼는 얘기라 약했다. webp는 iOS 14, Safari 14부터 되고 그 아래는 이 앱이 어차피 지원하지 않는다.

처음엔 릴 쪽은 못 바꾼다고 봤다. 릴 preload 주소는 react-tweet 임베드가 실제로 그리는 주소와 글자까지 같아야 해서(KAN-422, 다르면 사진을 두 번 받는다) 임베드가 jpg를 그리는 한 preload도 jpg여야 한다고 생각했다. 사용자가 "임베드가 그리는 주소도 webp로 못 바꾸냐"고 물어서 react-tweet 소스를 열어 봤다. `EmbeddedTweet`은 `components` prop으로 내부 컴포넌트를 갈아 끼울 수 있고 그중 `MediaImg`가 사진 `<img>`다. `TweetMedia`가 `getMediaUrl(media, "small")`로 만든 `src`(`?format=jpg&name=small`)를 그대로 넘겨 주므로, 우리 `MediaImg`가 `format`만 `webp`로 바꿔 그리면 된다. preload도 같은 함수로 주소를 만들면 글자까지 일치한다.

예외는 영상 릴이다. 영상의 포스터 이미지는 `TweetMediaVideo`가 `getMediaUrl`을 직접 불러 `<video poster>`에 넣고 이건 `components`로 바꿀 수 없다. 그래서 주소 함수는 `media.type`이 `photo`일 때만 webp로 바꾸고 영상 포스터는 원래 확장자를 둔다. 결론은 "사진은 전부 `small` + `webp`, 주소는 함수 하나"가 됐다.

### srcset: 티켓에 적었지만 달지 않기로

티켓에는 `srcset`(small·medium)과 `sizes`를 달자고 적어 뒀는데, 계산해 보니 득이 없었다. `srcset`은 두 가지 방식이 있다. 너비 서술자(`680w, 1200w`)는 브라우저가 `sizes`로 계산한 필요 너비 이상인 가장 작은 후보를 고른다. 모바일은 필요 너비가 510~570px이라 어차피 `small`(680w)을 고른다. 데스크톱 DPR 2에서 세로 사진만 `medium`을 고르게 되는데, 그러려면 사진마다 `small`의 실제 너비(가로 사진 680, 세로 사진 510)를 알아야 해서 `imageUrl` 문자열 하나인 도메인 타입에 너비를 같이 실어야 한다. 배율 서술자(`small 1x, medium 2x`)는 DPR 3 폰이 전부 `medium`을 골라 버려 이번 작업의 주 대상인 모바일이 209KB짜리를 받는다. 목적과 반대로 간다.

그래서 `src` 하나에 `small`만 쓴다. 데스크톱 세로 사진 14% 업스케일은 눈으로 확인해 보고 흐리면 웹만 `medium`으로 바꿀 수 있게 변형을 인자로 받는 함수로 만든다.

### 규칙을 한 곳으로

같은 저장소에 트윗 사진 주소를 만드는 규칙이 둘이었던 게 이번 문제의 뿌리라, 하나로 모은다. 어느 쪽 형태로 모을지가 문제였다. `tweet-media.ts`는 `…/ID.jpg?name=large`고 `tweet.ts`는 react-tweet을 따라 확장자를 떼고 `…/ID?format=jpg&name=small`이다. CDN은 둘 다 받아 주지만 URL 문자열이 다르면 브라우저 캐시 키가 다르다. 릴 임베드가 그리는 주소와 글자까지 같아야 preload가 맞는다는 KAN-422의 제약이 있으니 react-tweet 형태를 표준으로 삼고, `packages/core/src/tweet-media.ts`에 `tweetPhotoUrl(mediaUrl, size)`를 두어 핫이슈 카드와 릴 preload가 같은 함수를 부르게 한다.

## 구현

바꾼 파일은 여섯이고 핵심은 함수 하나다.

`packages/domain/src/tweet-photo.ts`에 `tweetPhotoUrl(url, size, format?)`를 뒀다. `@plick/core`가 아니라 `@plick/domain`에 둔 이유는 의존 방향이다. 이 함수를 `@plick/ui`의 컴포넌트가 불러야 하는데 `ui`는 `domain`만 의존하고 `core`(데이터 레이어)는 모른다. 순수 문자열 함수라 도메인 포맷 유틸 자리에 맞기도 했다. 함수는 입력이 신디케이션의 원본 경로(`…/ID.jpg`)든 react-tweet이 만든 변형 주소(`…/ID?format=jpg&name=small`)든 받아서, 확장자를 경로에서 떼어 `format=`으로 옮기고 `name=`을 붙인다. react-tweet `getMediaUrl`과 같은 모양이라 어느 쪽에서 만들어도 글자가 같다. `format`을 생략하면 원래 확장자를 유지한다. 영상 포스터가 그 경로다. `twimg.com` 밖 주소는 손대지 않고 돌려준다. BE 대표 이미지(`article_summaries.image_url`)가 다른 호스트일 수 있어서다.

`packages/core/src/tweet-media.ts`는 `LARGE_VARIANT`와 `withLargeVariant`를 지우고 `tweetPhotoUrl(url, "small", "webp")`로 바꿨다. 옛 응답 형태 폴백(`tweet.photos`)도 같은 함수를 거친다. 거기 URL은 이미 변형이 붙어 있을 수 있는데 함수가 그 모양도 받으니 분기가 필요 없어졌다.

`packages/ui/src/TweetMediaImg.tsx`는 react-tweet `MediaImg`의 교체품이다. 원본은 받은 props를 `<img>`에 그대로 넘기는 네 줄이고, 교체품은 `src`만 `tweetPhotoUrl(src, "small", "webp")`로 바꿔 넘긴다. 두 앱 `TweetEmbed`가 `<EmbeddedTweet components={{ MediaImg: TweetMediaImg }}>`로 꽂는다.

모바일 `_utils/tweet.ts`의 `tweetImageUrl`은 손으로 옮겨 적었던 `getMediaUrl` 규칙을 지우고 같은 함수를 부른다. 미디어가 `photo`면 webp, 영상이면 포맷을 생략해 포스터 주소를 react-tweet과 같게 둔다. 이 한 줄이 KAN-422의 "preload와 렌더가 같은 리소스를 맞혀야 한다"를 지키는 자리다.

`tests/unit/tweet-photo.test.mjs`에 다섯 케이스를 넣었다. 원본 경로와 변형 주소가 같은 결과를 내는지가 핵심이다. 그게 깨지면 릴 첫 장을 두 번 받는다.

웹 앱에는 preload가 없어서 `TweetEmbed` 한 줄만 바뀌었다. 데스크톱 핫 카드는 `withTweetPhotos`를 공유하니 자동으로 따라온다.

## 검증

타입 검사, 린트, 유닛 테스트(84건)가 통과했다. 그다음 prod BE를 보는 로컬 prod 빌드(`API_BASE_URL=https://plick.co.kr/be pnpm --filter mobile build`, `next start` 3061)를 띄워 서빙 HTML을 curl로 봤다.

홈 핫이슈 카드 세 장의 `src`가 전부 `…?format=webp&name=small`이었다. 릴은 세 종류를 봤다. 오늘 첫 릴은 사진 없는 텍스트 트윗이라 preload 자체가 안 나오는 게 맞았고, 사진 릴(`/reels/7857`)은 `<link rel="preload">`의 href와 임베드 `<img src>`가 `…/HUckO6GXIAABUeN?format=webp&name=small`로 글자까지 같았다. 영상 릴(`/reels/7836`)은 preload와 `<video poster>`가 `…/amplify_video_thumb/…?format=jpg&name=small`로 같았다. 영상은 포맷을 생략하는 분기가 제대로 react-tweet 쪽 주소를 따라간 것이다.

## 결과 1. 로컬 prod 빌드 전후

prod 수치는 배포 뒤에야 다시 잴 수 있어서, 먼저 같은 기계에서 develop(전)과 이 브랜치(후)를 각각 prod 빌드해 `next start`로 띄우고 Lighthouse CLI 3회씩 돌렸다. 둘 다 prod BE를 보고 사진은 트위터 CDN에서 오니 바뀐 건 코드뿐이다.

|                     | 전 (develop) | 후 (KAN-624) |
| ------------------- | ------------ | ------------ |
| 성능 점수 중앙값    | 78           | 79           |
| 시뮬 LCP 중앙값     | 6.0s         | 5.6s         |
| 실측 LCP 중앙값     | 1.1s         | 0.9s         |
| 사진 3장 전송량     | 952KiB       | 170KiB       |
| LCP 사진 로드(시뮬) | 5.5s         | 5.1s         |

실측 LCP와 전송량은 기대대로 움직였다. 사진 3장이 955KiB에서 170KiB로 82% 줄었고, 스로틀링 없는 실측 LCP는 1초 안으로 들어왔다. 그런데 시뮬 LCP는 5초대에 머물렀다. 바이트가 82% 줄었는데 시뮬 로드 단계가 5초인 이유를 after 리포트의 요청 목록에서 찾았다. 사진 셋(68·43·59KiB)과 같은 순간(65ms)에 322KiB 가변 폰트가 High 우선순위로 출발한다. Lantern은 시뮬 4G 1.6Mbps 대역폭을 동시 요청이 나눠 쓰는 모델이라, 사진이 작아져도 폰트가 끝날 때까지 같은 파이프를 나눠 쓴다. 이게 메모리에 적어 둔 "바이트 절감은 시뮬 LCP를 거의 못 움직인다" 함정의 재현이고, 남은 5초의 주인은 KAN-629(텍스트 화면 LCP의 폰트 체인)다. 감사 때 "텍스트 화면"만의 문제로 분류했는데 사진 화면도 사진이 작아지는 순간 같은 바닥에 닿는다.

하나 더. after 리포트가 여전히 "이미지 크기 적절하게"에서 189KiB를 더 줄일 수 있다고 한다. Lighthouse 기본 모바일 에뮬레이션(Moto G Power)이 DPR 1.75라 170px 카드에 298px이면 된다고 보기 때문이다. 실제 주 사용 기기는 DPR 3이고 그러면 510px이 필요하니 `small`(680)이 맞다. `thumb`(150)로 가면 그 항목은 사라지지만 실기기에서 흐려진다. 점수 한 항목보다 화면을 택했다.

## 결과 2. 실제 대역폭을 걸면 절반이 된다

시뮬레이션이 폰트에 가려 사진 변화를 못 보여 주니, 같은 4G 수치를 크롬에 실제로 거는 `--throttling-method=devtools`로 홈을 3회씩 다시 쟀다. 이 모드는 Lantern 모델 대신 크롬 DevTools의 네트워크 스로틀링(1.6Mbps, RTT 150ms)과 CPU 4배 감속을 켜고 실제로 로드해 잰다.

|                  | 전   | 후   |
| ---------------- | ---- | ---- |
| 성능 점수 중앙값 | 76   | 92   |
| LCP 중앙값       | 6.9s | 3.4s |
| LCP 사진 로드    | 6.3s | 2.8s |

LCP가 절반이 됐고 점수는 주황(76)에서 초록(92)으로 넘어갔다. 사진 로드 2.8초가 남는 건 170KiB짜리 사진 셋이 322KiB 폰트, JS와 같은 1.6Mbps를 나눠 쓰기 때문이고, 같은 원인이 두 측정 방식에서 다른 크기로 나타난 것이다. 시뮬레이션은 그 경합을 더 비관적으로 모델링한다.

블로그에 어느 숫자를 쓸지 정리하면 이렇다. "사진 전송량 955KiB → 170KiB(−82%)"는 어느 모드에서나 같다. "LCP 6.9초 → 3.4초"는 실제 대역폭 제한 기준이다. "시뮬 LCP 7.7초 → 5.6초"는 prod 전과 로컬 후를 섞은 것이라 같은 줄에 쓰면 안 되고, 로컬 전후로는 6.0 → 5.6이다. 티켓 완료 조건에 적어 둔 "LCP 4초 이하"는 devtools 기준으로는 넘었고 시뮬 기준으로는 못 넘었다. 시뮬 4초는 폰트(KAN-629)까지 끝나야 닿는다.

## 결과 3. 시뮬레이터 눈 확인

iPhone 17 Pro 시뮬레이터(DPR 3) Safari로 로컬 빌드 홈을 열어 봤다. 170 CSS px 카드에 680px webp가 들어가 선명했다. 캡처는 `_workspace/2026-10-13-kan-624/blog-assets/simulator-iphone17pro-after.png`.
