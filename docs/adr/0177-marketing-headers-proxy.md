# 0177. 프록시가 마케팅 유입 파라미터를 쿠키에 심고 분석 헤더 여섯 개로 전달

KAN-577. 2026-09-28.

## 무슨 일이었나

광고 집행이 잡혔다. 백엔드는 KAN-575에서 행동 이벤트에 마케팅 유입 축 여섯 칸(`utm_campaign`,
`utm_medium`, `utm_content`, `referrer`, `click_id`, `click_source`)을 받을 자리를 먼저 만들어 뒀고,
값은 프런트가 `X-Plick-Utm-Campaign` 같은 요청 헤더로 보내기로 했다. 프런트가 안 보내는 동안 그 칸은
전부 `unknown`이거나 비어 있다. 광고가 돌기 시작한 뒤에도 이 상태면 그 기간의 캠페인별 성과는 영영
알 수 없다. 이벤트는 요청 시점에 찍히고 끝이라 나중에 채울 방법이 없어서다.

다행히 자리는 이미 있었다. KAN-542([ADR 0161](0161-analytics-headers-proxy.md))에서 기기 식별자와 유입
경로(`path`)를 쿠키에 심고 헤더로 넘기는 배관을 깔아 뒀다. 요약하면 이렇다.

1. 각 앱 `proxy.ts`가 요청마다 쿠키와 URL에서 값을 정한다(`resolveAnalytics`).
2. `NextResponse.next({ request: { headers } })`로 나가는 요청 헤더에 `X-Plick-*`를 찍는다. 이건 응답
   헤더가 아니라 다운스트림이 볼 요청 헤더를 바꾸는 것이라, 브라우저의 `/be` fetch면 rewrites를 타고
   BE까지 그대로 가고, 페이지 요청이면 이번 렌더의 서버 컴포넌트가 `headers()`로 읽는다.
3. 서버 측 `apiFetch`는 `instrumentation.ts`가 꽂아 둔 헤더 제공자가 `ANALYTICS_HEADER_NAMES`에 든
   이름만 요청 헤더에서 골라 옮겨 싣는다.
4. 게스트 발급과 토큰 재발급은 프록시가 `analytics.headers`를 통째로 넘긴다.

그래서 이번 일은 1번에서 값 여섯 개를 더 정하고 `ANALYTICS_HEADERS`에 이름 여섯 개를 더하는 것으로
거의 끝난다. 2~4번은 이름 목록을 순회하므로 손대지 않아도 따라온다. 실제로 고친 코드는 공용 규칙 파일
하나(`packages/core/src/marketing.ts`)와 두 앱 프록시의 `resolveAnalytics` 스무 줄 남짓이다.

## 값마다 규칙이 다르다

BE 계약 문서(plick-backend `docs/phases/54-analytics-marketing-axis.md`)를 먼저 읽었다. 헤더가 없거나
형식 밖이면 400을 내지 않고 접는다는 건 KAN-542 때와 같다. 칸별 규칙은 이렇다.

- utm 셋은 `[a-z0-9_.:+~|-]`에 상한 64/64/128. 대소문자는 서버가 소문자로 접는다. 상한을 넘으면 자르지
  않고 `unknown`이다. 잘라 쓰면 앞부분이 같은 다른 소재가 한 칸으로 합쳐지기 때문이다.
- `click_id`는 `[A-Za-z0-9_.:=~-]{1,128}`이고 대소문자를 절대 접지 않는다. 광고 플랫폼에 전환을
  회신할 때 플랫폼이 발급한 원값과 글자 하나까지 같아야 매칭된다. gclid는 base64url이라 `A`와 `a`가
  다른 값이다.
- `click_source`는 허용 목록이 아니라 형식만 본다. 매체를 추가할 때 서버 배포가 필요 없게 하려는
  KAN-552의 방향이다. 그래서 `fbclid → meta`, `gclid → google`, `ttclid → tiktok` 매핑은 프런트의
  `CLICK_ID_PARAMS` 한 곳에 두고, 매체가 늘면 거기 한 줄만 더한다.
- `referrer`는 서버가 호스트만 남긴다. 그래도 프런트에서 미리 호스트만 잘라 보낸다. 검색이나
  커뮤니티에서 온 리퍼러 쿼리에는 검색어처럼 개인을 짚을 수 있는 값이 섞이는데, 애초에 보내지
  않으면 서버 로그에도 안 남는다.

## 서버가 다 접어 주는데 프런트는 왜 또 거르나

처음엔 "서버가 형식 밖 값을 알아서 접으니 프런트는 URL 값을 그대로 넘기면 된다"고 생각했다. 티켓도
utm 대소문자는 맞출 필요가 없다고 적어 뒀다. 그런데 한 가지가 걸렸다. HTTP 헤더 값은 바이트 문자열이다.
Fetch 표준의 `Headers.set`은 Latin-1 범위 밖 문자가 오면 `TypeError`를 던진다. 한국 서비스라 누군가
`?utm_campaign=추석이벤트`로 링크를 만들 가능성은 충분하고, 그 값을 거르지 않고 `headers.set`하면
프록시가 그 자리에서 죽는다. 프록시가 죽으면 페이지 전체가 500이다. 분석 값 하나 때문에 서비스가
멈추는 꼴이다.

그래서 프런트도 BE와 같은 패턴으로 거른다. 형식 밖이면 헤더를 아예 빼고, 서버가 `unknown`이나 빈
값으로 접게 둔다. utm 패턴은 대소문자를 둘 다 받게 해서 원값을 넘긴다(접는 건 서버 몫이다). 이러면
헤더에 실리는 값은 모두 ASCII라 던질 일이 없다. 쿠키도 같은 걸 거친다. 쿠키는 HttpOnly여도
개발자 도구에서 고칠 수 있으니, 읽을 때도 믿지 않는다.

## 쿠키를 칸마다 두지 않고 한 덩어리로

티켓의 쿠키 정책은 `plick_path`와 같게, "새 파라미터가 오면 갱신, 없으면 기존 값 유지"다. 이걸 칸마다
적용하면 문제가 생긴다. 어제 인스타 광고(`utm_campaign=a`, `utm_content=reel1`, `fbclid=...`)로 들어온
사람이 오늘 구글 광고(`utm_campaign=b`, `gclid=...`)로 다시 들어왔다고 하자. 칸마다 유지하면
`utm_campaign=b`에 어제의 `utm_content=reel1`이 남는다. 클릭 식별자 쪽은 더 나쁘다. gclid가 들어와 덮으면
괜찮지만, 식별자 없이 utm만 달고 들어오면 어제의 `fbclid`와 `click_source=meta`가 오늘의 구글
캠페인에 붙는다. 집계에서는 틀린 값이 맞는 값처럼 보인다.

그래서 여섯 칸을 한 덩어리로 다룬다. 이번 페이지 요청이 "새 유입"이면 덩어리를 통째로 갈고, 아니면
쿠키 값을 그대로 쓴다. 새 유입의 판정은 둘 중 하나다.

- URL에 유입 파라미터가 하나라도 있다. utm 셋, 클릭 식별자 셋, 그리고 `plick_path`가 읽는 `path`와
  `utm_source`까지. 공유 링크(`?path=share`)로 새로 들어온 사람에게 지난 캠페인 값이 남으면 안 되니까
  `path`도 포함했다.
- Referer가 외부 도메인이다.

둘 다 없는 요청은 앱 안에서 옮겨 다니거나 주소를 직접 친 경우라 기존 값을 유지한다. 티켓 문구를 칸
단위가 아니라 덩어리 단위로 읽은 셈이다. 이건 GA의 last non-direct click과 같은 모델이다. 직접 유입은
이전 유입을 덮지 않고, 출처가 있는 유입은 덮는다.

덩어리라 쿠키도 하나(`plick_mkt`)다. 값은 `URLSearchParams` 문자열(`c=...&m=...&i=...&s=...`)이고 키는
한 글자로 줄였다. 쿠키는 같은 도메인의 모든 요청에 실리니 여섯 개로 나누면 이름만큼 매 요청이 무거워진다.
Next의 `response.cookies.set`이 값을 퍼센트 인코딩하고 `request.cookies.get`이 풀어 주므로 `=`나 `&`가
섞여도 왕복이 된다. 이건 curl 쿠키 저장소에 찍힌 원문(`c%3DOpening-2026.09%26m%3D...`)으로 확인했다.
HttpOnly이고 수명은 다른 분석 쿠키와 같은 400일(크롬의 `Max-Age` 상한)이다.

`plick_path`는 이번에 건드리지 않았다. 그래서 외부 Referer만 있고 파라미터가 없는 방문에서는 마케팅
덩어리가 새로 갈리는 동안 `path`는 예전 값을 유지하는 어긋남이 남는다. `path` 규칙은 KAN-542 계약이라
따로 판단할 일로 뒀다.

## referrer는 `document.referrer`가 아니라 Referer 헤더에서

티켓은 `document.referrer`라고 적었지만 그건 브라우저 JS에서만 읽힌다. 값을 정하는 자리는 서버에서
도는 프록시다. 대신 브라우저가 페이지를 열 때 보내는 `Referer` 요청 헤더가 같은 값이다.
`document.referrer`는 그 문서를 연 요청의 Referer를 그대로 노출한 것이기 때문이다. 기본
Referrer-Policy(`strict-origin-when-cross-origin`)에서는 다른 도메인으로 가는 요청에 경로 없이
오리진만 실리니, 대부분 이미 호스트까지만 온다. 그래도 정책을 바꾼 사이트나 오래된 브라우저를 생각해
`new URL(referer).hostname`만 뽑는다.

외부 유입이 아닌 Referer를 걸러내는 게 까다로웠다. 셋을 뺐다.

- 자기 도메인. 앱 안 이동은 Referer가 자기 페이지다. 이번 요청의 호스트와 같거나(`localhost` 개발
  환경 포함) `plick.co.kr`의 하위 도메인이면 뺀다. PC·모바일 전환 배너로 `plick.co.kr`에서
  `m.plick.co.kr`로 건너온 것도 외부 유입이 아니다.
- 소셜 로그인 제공자(`accounts.google.com`, `kauth.kakao.com`, `appleid.apple.com`). 이걸 놓칠 뻔했다.
  카카오 로그인을 마치고 콜백으로 돌아오는 요청의 Referer는 `kauth.kakao.com`이다. 그리고 콜백 라우트가
  302로 홈에 보낸 다음 요청도 같은 Referer를 들고 온다. Fetch 표준에서 리다이렉트는 원 요청의
  referrer를 바꾸지 않기 때문이다. 거르지 않으면 로그인할 때마다 유입이 카카오로 덮이고 광고 캠페인
  값이 날아간다. 제공자 목록은 각 앱 `_constants/api.ts`의 authorize URL에서 뽑았다.
- `/be` fetch 전부. 이 요청의 Referer는 늘 자기 페이지이고 쿼리도 BE API 파라미터다. 그래서 `/be`에서는
  `resolveMarketing`을 아예 부르지 않고 쿠키 값만 헤더로 편다.

## 크롤러와 위조 헤더

크롤러는 쿠키를 안 들고 다닌다. 그래서 기기 식별자처럼 마케팅 쿠키도 심지 않는다. 심어 봐야 다음 요청에
안 돌아오고 Set-Cookie만 낭비된다. 헤더는 이번 URL 값으로 싣는다.

브라우저가 `X-Plick-Click-Id`를 직접 달아 보내면 어떻게 되나. `forward`가 `ANALYTICS_HEADERS`의 모든
이름을 순회하면서 프록시 값이 있으면 덮고 없으면 지운다(진입 화면만 예외). 이름을 목록에 더한 것만으로
위조 방어까지 따라왔다. 이건 아래 검증 2번에서 확인했다.

## 확인한 방법

진짜 BE 로그를 보려면 로컬 BE를 KAN-575 이후로 올려 띄워야 했는데, 로컬 체크아웃이 뒤처져 있었다. 대신
프런트가 무엇을 보내는지만 보면 되니, 로컬 mock BE(8081) 앞에 헤더를 파일에 적고 그대로 넘기는 30줄짜리
Node 중계기(8095)를 세웠다. 모바일 앱은 `API_BASE_URL=http://localhost:8095`로 빌드했다. 다른 세션의
`next dev`가 락을 쥐고 있어 dev 서버를 띄울 수 없어서 `next build` 후 `next start`로 돌렸다.
`API_BASE_URL`이 rewrites에 빌드 시점으로 굳는 값이라 빌드 때 줘야 했다.

시나리오는 curl로 쿠키 저장소와 Referer를 손으로 맞춰 돌렸다. 브라우저 패널은 `localhost` 쿠키가 포트와
상관없이 공유돼 첫 진입 상태를 만들기 어렵다.

1. 쿠키 없이 `/?utm_source=insta&utm_campaign=Opening-2026.09&...&fbclid=IwAR0-AbC_123`, Referer
   `https://l.instagram.com/?u=secret`. 게스트 발급 POST와 홈 서버 fetch 다섯 개 모두에 여섯 헤더가
   실렸다. referrer는 `l.instagram.com`만, click_id는 대소문자 그대로, click_source는 `meta`.
2. 그 쿠키로 `/be/api/v1/articles`를 `X-Plick-Click-Id: FORGED`와 함께 요청. BE에는 쿠키 값이 갔다.
3. 앱 안 이동(`/reels`, Referer 자기 페이지). 쿠키와 헤더가 그대로 유지됐다.
4. Referer `https://kauth.kakao.com/`로 홈. 덩어리가 안 바뀌었다.
5. `/?gclid=Cj0KCQjw-AbCdEf_GhI`. 덩어리가 통째로 갈려 utm·referrer가 빠지고 `google`이 됐다.
6. `/?utm_campaign=추석&utm_medium=paid social`. 200으로 떴고 두 헤더는 빠졌다.
7. 파라미터 없는 새 방문자. `plick_mkt` 쿠키가 안 생기고 헤더는 KAN-542 때와 같았다.

웹 프록시는 모바일과 같은 코드라(파일 머리 주석 한 줄만 다르다) diff로 동일함을 확인하고 타입 검사와
빌드로 갈음했다. `pnpm format:check`, `test:hooks`, `lint`, `check-types`, `build`는 모두 통과했다.

## 리뷰 게이트가 짚은 것

첫 커밋 뒤 `scripts/review/pr-review.sh`를 돌렸다. CRITICAL은 없었고 WARN 셋이 나왔는데 셋 다 맞는 말이라
고쳤다.

첫째, `path` 파라미터가 형식 검사 없이 새 유입을 일으켰다. 처음엔 `TOUCH_PARAMS`에 `"path"`와
`"utm_source"`를 넣고 `searchParams.has`로만 봤다. 그러면 `?path=../x`처럼 `plick_path`는 무시하는 값이
붙은 링크 하나로 마케팅 덩어리가 통째로 비워진다. 누가 퍼뜨린 이상한 링크 때문에 어제 캠페인 귀속이
사라지는 셈이다. 이제 `path`·`utm_source`는 `plick_path`와 같은 함수(`readPathParam`)가 값을 인정할 때만
새 유입으로 친다. utm 셋과 클릭 식별자는 반대로 값이 형식 밖이어도 새 유입으로 둔다.
`?utm_campaign=추석`은 헤더에 못 실을 뿐 새 캠페인으로 들어온 건 사실이라, 지난 캠페인 값을 남기면
오히려 틀린 귀속이 된다.

둘째, 로그인 제공자 목록에 `accounts.kakao.com`이 없었다. 카카오는 authorize 요청을 `kauth.kakao.com`에
보내지만 실제 아이디 입력 화면은 `accounts.kakao.com`에서 열린다. 거기서 제출한 폼이 리다이렉트를 타고
콜백에 닿으면 Referer는 로그인 화면 쪽 호스트다. 넣었다.

셋째, 테스트가 없었다. `packages/core`에는 테스트 러너가 없고 새로 들이자니 의존성과 lockfile이
따라온다. Node 22에 있는 것만으로 풀었다. `node --test`가 러너이고, `--experimental-strip-types`가
`.ts`의 타입 표기를 걷어 바로 실행한다. 막힌 곳은 import 해석이었다. `marketing.ts`는 번들러 관례대로
`./analytics`를 확장자 없이 부르는데 Node 해석기는 확장자를 추측하지 않아 `ERR_MODULE_NOT_FOUND`로
죽는다. 그래서 `tests/unit/register.mjs`가 `module.register`로 해석 훅 하나를 건다. 상대 경로 해석이
실패하면 `.ts`를 붙여 한 번 더 찾는 열 줄짜리다. `pnpm test:unit`으로 돌고 CI에도 붙였다. 케이스는
광고 진입, 클릭 식별자 대소문자, 헤더에 못 싣는 값, 덩어리 교체와 유지, 형식 밖 `path`, 제외할 Referer,
쿠키 왕복, 프록시 조립 여덟 개다.

INFO 가운데 둘도 받았다. 두 프록시에 글자까지 같은 스무 줄이 복제돼 있던 것을
`resolveRequestMarketing` 하나로 core에 옮겼고, 두 프록시는 호출 한 번이 됐다. 그리고 모든 칸이 형식
밖이라 덩어리가 비면 빈 쿠키를 400일짜리로 심던 것을 지우기로 바꿨다(`Set-Cookie: plick_mkt=;
Expires=1970...`). 고친 뒤 중계기로 다시 돌려 `accounts.kakao.com` 무시, `?path=../x` 무시,
`?path=share`에서 쿠키 삭제를 확인했다.

두 번째 리뷰에서는 `?utm_source=insta`만 달린 링크도 덩어리를 비운다는 지적이 나왔다. 여섯 칸 어디에도
안 실리는 값 때문에 어제 캠페인의 `utm_campaign`과 `click_id`가 지워진다는 것이다. 이건 의도다.
인스타 프로필 링크처럼 `utm_source`만 붙은 링크로 다시 들어온 사람은 새로 인스타에서 온 사람이고,
그 방문을 어제 광고 캠페인에 귀속하면 광고 성과가 부풀려진다. last-touch 모델에서는 지우는 쪽이 맞다.
대신 로그인 제공자 목록이 앱의 `OAUTH_PROVIDERS`와 어긋날 수 있다는 지적은 테스트로 막았다. 두 앱
`_constants/api.ts`에서 authorize 호스트를 읽어 `AUTH_HOSTS`에 다 있는지 본다. 제공자를 추가하고
여기를 빠뜨리면 CI가 깨진다. 길이 상한 경계(64/65, 128/129)와 `click_source` 없는 위조 쿠키 케이스도
더했다.

## 남은 것

- `plick_path`와 마케팅 덩어리의 갱신 규칙이 다르다(위 절). 집계에서 둘을 같이 볼 때 알아 둘 것.
- 공유 링크에 `?path=share`를 박는 작업은 별도 티켓이다.
- 소셜 로그인 제공자가 늘면 `marketing.ts`의 `AUTH_HOSTS`에도 더해야 한다.
