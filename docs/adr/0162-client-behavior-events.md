# 0162. 행동 이벤트(진입, 화면 전환, 원문 클릭, 읽기 종료, 공유) 전송과 조회 기록 호출 정비

KAN-543. 2026-09-19.

## 무슨 일이었나

KAN-542에서 분석 헤더 넷을 프록시에 붙였다(ADR 0161). 그걸로 서버가 스스로 아는 행동(조회, 좋아요,
댓글, 투표, 게스트 발급)에는 기기 식별자와 유입 경로가 실리게 됐다. 그런데 DAU 퍼널의 첫 두 단계인
"들어왔다"와 "화면을 봤다"는 서버가 모른다. 특히 이 앱은 캐시 때문에 서버 요청 없이 화면이 바뀌는
곳이 많다. 팀 필터 탭, 경기 상세 탭, 릴 세부 시트, 마이페이지 활동 탭이 그렇다. 서버 요청만 세면
사용자가 본 것의 절반이 안 보인다. 그래서 클라이언트가 직접 보내는 이벤트 다섯 개를 붙이는 게 이번
티켓이다. `app_entered`, `screen_viewed`, `outbound_clicked`, `read_finished`, `share`.

거기에 조회 기록 호출도 손봤다. 프런트가 세션 안에서 기사당 한 번으로 접고 있어서 같은 기사를 다시
열어도 열람 이벤트가 한 건만 남았고, 비로그인이면 아예 안 불렀다. 둘 다 풀고 피드 순위(`?rank=`)를
실었다. Phase 33, 35 때 합의만 하고 안 들어간 항목들이다.

모바일 웹과 데스크톱 웹 둘 다다.

## 계약부터 확인했다

티켓과 Confluence 문서를 그대로 믿지 않고 `be-verify` 서브에이전트에게 로컬 BE로 실제 shape를
확인하게 했다. 몇 가지가 여기서 정해졌다.

- 필드는 camelCase이고 `articleId`는 숫자(int64)다. 도메인 타입의 id는 문자열이라 보낼 때 바꿔야 한다.
  문자열 `"8032"`도 Jackson이 강제 변환해 통과하긴 했지만 계약은 숫자다.
- 값 규칙을 어긴 건은 그 건만 조용히 버리고 요청은 202다. 대문자 `screen`, 없는 기사 id, 모르는
  `type`을 섞어 보내도 202였고 그 건만 로그에서 빠졌다. 400을 주지 않는 이유는 분석 값 때문에 재시도
  트래픽이 늘지 않게 하려는 것이다. 그래서 프런트도 재시도하지 않는다.
- Content-Type이 JSON이 아니면 500이다. `text/plain`으로 보내니 `HttpMediaTypeNotSupportedException`이
  났다. `navigator.sendBeacon`은 기본이 `text/plain`이라 그대로는 못 쓴다. 이게 전송 수단을 정하는
  근거가 됐다(아래).
- 스웨거에 `origin`이라는 필수 쿼리 파라미터가 보이는데 허상이다. `RequestOrigin` 인자 리졸버(헤더
  기반)를 springdoc이 잘못 노출한 것이라 안 보내도 된다.
- 서버 로그의 이벤트 이름은 보내는 `type`과 다른 게 둘 있다. `read_finished`는 `article_read_finished`로,
  `share`는 `reaction`(`reaction_type=share`)으로 찍힌다. 완료 조건의 이름이 그래서 그렇다.
- 조회 기록(`POST /articles/{id}/view`)은 스웨거에 `rank`(int32, 선택) 쿼리가 있고, 토큰 없이 불러도
  200이다. 비로그인이면 기록과 조회수 없이 `article_opened`만 남긴다. 같은 기사에 두 번 부르면 둘 다
  200이고 `article_opened`가 두 줄 찍히지만 DB `article_views`는 한 행이다(하루 1회 유니크).

## 어디에 무엇을 뒀나

이벤트 코드는 두 앱이 똑같이 쓴다. 큐, 전송, 라우트 표, 읽기 세션은 Next에 의존하지 않는 순수
모듈이라 처음부터 `@plick/core`에 뒀다(ADR 0011 게이트 C, 분석 헤더 상수와 같은 판단).

- `events.ts`: 이벤트 타입, 큐와 묶음 전송, `app_entered` 판정(`touchSession`), 이벤트별 헬퍼
  (`trackScreenViewed`, `trackOutboundClicked`, `trackShare`, `trackReadFinished`).
- `screens.ts`: 라우트 경로 → `screen` 값 표(`resolveScreen`). 고정 경로 표 하나와 동적 패턴 배열
  하나다. 새 라우트가 생기면 여기 한 줄 더한다.
- `reading.ts`: 기사 읽기 세션. 시작 시각과 "끝까지 내렸는지"를 기사 id로 들고 있다가 닫을 때 보낸다.
- `article-views.ts`: 조회 기록에 `rank`를 붙이고, 피드 순위를 링크 클릭에서 기사 화면까지 넘기는
  `rememberFeedRank`, `takeFeedRank`.

React와 Next에 닿는 조각은 앱마다 한 벌씩이다. 관용대로 훅은 `_hooks/`에, 컴포넌트는 `_components/`에
뒀고 두 앱이 거의 같은 파일을 갖는다(`useArticleView`가 원래 그랬다).

- `AnalyticsTracker`: 루트 레이아웃에 하나. `usePathname`으로 라우트 전환을 듣고, 진입을 판정한다.
- `useScreenTabView`: 화면 안 탭 전환. 경기 상세, 팀 프로필, 활동 탭이 부른다.
- `useArticleRead`: 기사 화면의 읽기 세션 시작과 종료. `ArticleViewTracker`가 조회 기록과 같이 부른다.
- `ReadEndSentinel`: 본문 끝의 빈 줄. 화면에 들어오면 "끝까지 내렸다"로 표시한다.
- `ArticleLink`: 목록에서 기사로 가는 링크. 누를 때 순위를 기억한다.
- `ArticleSourceLink`: 원문 버튼에 `outbound_clicked`를 붙인 것.

`@plick/ui`의 `SourceLinkButton`은 `onOpen` 콜백 하나만 받게 늘렸다. ui는 분석을 몰라야 하니
(게이트 A) 무엇을 기록할지는 호출부 몫이다.

## 묶어 보내기와 전송 수단

한 요청 최대 20건, 사용자당 분당 60회가 상한이다. 큐에 넣고 첫 이벤트에서 3초 뒤에 묶어 보내며
20건이 차면 바로 보낸다. 3초면 최대 분당 20회라 상한에 여유가 있고, 탭을 연달아 누르는 버스트가 한
요청으로 접힌다. 화면을 떠날 때(`pagehide`, 탭이 가려질 때)는 기다리지 않고 비운다. 탭이 이미 가려진
상태에서 들어온 이벤트는 타이머를 못 믿으니 그 자리에서 보낸다. 모바일에서 앱을 내리면 타이머는
멈추고 프로세스가 죽을 수 있다.

전송은 `fetch`의 `keepalive`다. 티켓은 `sendBeacon` 등을 말했는데, `sendBeacon`은 Content-Type을
JSON으로 못 정하고(Blob으로 감싸면 되긴 한다) 무엇보다 Authorization과 커스텀 헤더를 못 싣는다. 이
엔드포인트는 Bearer가 필수다. 토큰은 HttpOnly 쿠키라 브라우저가 못 읽고, 각 앱 `proxy.ts`가 `/be`
요청에 실어 준다(KAN-308). `keepalive` fetch는 평범한 요청이라 프록시를 그대로 지나가고, 페이지가
언로드돼도 요청이 살아남는 점은 `sendBeacon`과 같다. 본문 상한 64KB는 20건짜리 JSON 근처에도 안 간다.

`apiFetch`를 안 쓰고 날 `fetch`를 쓴 건 응답을 안 읽기 때문이다. 202면 끝이고 실패는 삼킨다. 봉투를
벗기고 에러를 정규화할 이유가 없다.

## 진입을 어떻게 세나

"서비스 진입 시 1회, 30분 넘게 조작이 없다가 다시 쓰면 다시 1회"다. 마지막 조작 시각을
`localStorage`(`plick_last_active`)에 두고, 마운트와 라우트 전환, 탭이 다시 보일 때, 터치와 키 입력마다
`touchSession`을 부른다. 30분보다 오래됐거나 기록이 없으면 `app_entered`를 보낸다.

저장소를 쓰는 이유는 둘이다. 새로고침이 방문이 되면 안 되고(메모리에만 두면 리로드마다 새 진입이다),
탭을 하나 더 여는 것도 방문이 아니다. 저장소는 오리진 단위라 두 탭이 같은 값을 본다. 저장소 쓰기는
10초에 한 번으로 줄였다. 조작마다 쓰면 스크롤 중 프레임마다 디스크를 건드린다. 시크릿 모드처럼
저장소가 던지면 메모리 값으로 폴백한다.

검증에서 모바일(3001)과 웹(3000)이 각각 `app_entered`를 보냈다. 오리진이 달라 저장소가 따로라서다.
실제 배포에서도 `m.plick.co.kr`과 `plick.co.kr`은 다른 사람으로 세어지는데, 이건 기기 식별자를 배너
쿼리로 넘기는 규칙(ADR 0161)이 잇는 문제고 방문 수는 도메인별로 세어도 틀린 게 아니다.

## 화면 전환을 어디서 잡나

라우트 전환은 `usePathname`이다. Next App Router는 `history.replaceState`도 가로채 라우터 상태에
반영한다. 이 앱은 홈 팀 필터(`/teams/[slug]`), 기사 팀 필터(`/articles/teams/[slug]`), 릴 넘김
(`/reels/{id}`)이 전부 `replaceState`로 URL만 바꾸는데, 그게 다 `usePathname`에 잡힌다. 검증에서 홈
팀 탭을 누르니 `team_hub ref=liverpool`이 찍혔다. 서버 요청 없는 전환이 잡힌 첫 사례다.

같은 화면과 ref면 다시 보내지 않는다. 릴을 넘길 때마다 `/reels/{id}`가 바뀌는데 그때마다 보내면 릴
한 장이 화면 하나가 되고, 어느 릴을 봤는지는 조회 기록(`article_opened`)이 이미 남긴다. 그래서
`screens.ts`가 `/reels/{id}`를 `reels`로 접고 ref를 안 싣는다. ref를 안 실으니 연속 릴 넘김이 한 값으로
접혀 dedupe에 걸린다.

라우트로 모르는 전환은 셋이다. 경기 상세 탭, 팀 프로필 탭, 활동 탭(`?tab=`은 쿼리라 pathname이 안
바뀐다). 여기는 탭 컴포넌트가 `useScreenTabView`를 부른다. 이 훅은 처음 보이는 탭을 보내지 않는다.
라우트 진입을 `AnalyticsTracker`가 이미 화면 하나로 세고 있어, 기본 탭까지 보내면 진입 한 번이 화면
둘이 된다. 이탈률이 "진입 후 `screen_viewed` 2개 미만"이라 그러면 이탈률이 0이 된다. 탭이 바뀐 뒤부터
`match_detail.lineups`처럼 나간다.

릴 세부 시트(모바일)와 패널(웹)은 열리는 순간 `reels.detail`을 ref 릴 id로 보낸다. 시트를 여는
콜백에 한 줄 넣었다. 웹 패널은 데스크톱에서 기본으로 열려 있는데, 그 상태에서 릴을 넘길 때마다 보내면
릴 넘김이 화면 전환이 되니 사용자가 열었을 때만 보낸다.

StrictMode를 신경 썼다. dev에서 React가 마운트 직후 이펙트를 한 번 떼었다 다시 붙인다. 화면
dedupe는 "마지막으로 보낸 키"를 ref에 두고 비교하니 되감기에서 같은 키라 안 나가고, 탭 훅도
"마지막으로 본 탭"을 ref에 두는 식이라 같다. `first` 플래그 방식이었으면 되감기에서 플래그가 이미
내려가 있어 기본 탭이 나갔을 것이다.

## 읽기 종료

기사 화면을 닫을 때 `articleId`, 머문 밀리초, 끝까지 내렸는지를 보낸다. 시작과 끝은
`ArticleViewTracker`(마운트와 언마운트)가 알고 "끝까지 내렸다"는 본문 끝의 `ReadEndSentinel`이 안다.
둘이 다른 컴포넌트라 React 트리 밖 모듈(`reading.ts`)에서 기사 id로 잇는다.

언마운트를 곧바로 종료로 치지 않고 `setTimeout(0)`으로 한 틱 미룬다. StrictMode 되감기를 종료로 세면
체류 0ms짜리 이벤트가 나간다. 미룬 종료를 다음 마운트가 취소하면 되감기는 아무것도 안 남긴다. 서버
규칙이 `dwellMs` 1 이상 30분 이하라 그 범위로 접는다.

탭을 닫거나 다른 사이트로 가면 언마운트가 안 온다. `pagehide`에서 열린 세션을 전부 닫고 큐를
비운다. 종료 뒤에는 큐를 바로 비운다. 소프트 내비게이션이면 다음 화면이 이어 쓰지만 언로드 직전이면
타이머가 안 돈다.

본문 끝 표식은 문단, 칩, 투표 카드 다음, 추천 기사와 댓글 앞이다. 추천 기사와 댓글은 본문이 아니다.
`IntersectionObserver`로 보니 스크롤 컨테이너를 몰라도 된다. 모바일은 `ScrollArea` 안이고 웹은 문서
스크롤이라 컨테이너가 다른데 뷰포트 교차만 보면 둘 다 같다.

## 조회 기록 접힘을 걷었다

`useArticleView`가 모듈 Set으로 세션 안 기사당 한 번만 보내고 비로그인은 안 불렀다. 둘 다 걷었다.
서버가 하루 한 번으로 접으니 조회수는 안 부풀고, 비로그인은 서버가 기록 없이 이벤트만 남긴다.

대신 한 번의 활성 구간 안에서는 한 번만 보낸다. 마지막으로 보낸 id를 ref에 들고 활성이 풀리면
지운다. 릴이 활성인 채로 리렌더되거나 StrictMode가 되감아도 같은 요청이 반복되지 않고, 릴을 앞으로
넘겼다 다시 돌아오면 활성이 한 번 풀렸으니 다시 보낸다. 그게 건별 열람이다.

순위는 목록이 알고 조회 기록은 기사 화면이 보낸다. 둘 사이에 라우트 전환이 있어 prop으로 못 잇고,
URL 쿼리에 실으면 공유하고 색인되는 주소가 더러워진다. 그래서 링크를 누를 때 모듈 Map에 적어 두고
(`rememberFeedRank`) 기사 화면이 꺼내 쓴다(`takeFeedRank`). 10초 수명을 뒀다. cmd+클릭으로 새 탭에
열면 이 탭에는 기사 화면이 안 뜨고 값만 남는데, 한참 뒤 관련 기사로 같은 글을 열었을 때 그 옛 순위가
붙으면 안 된다.

목록 행(`NewsItem`, `PostListItem`, 핫이슈 카드)은 서버 컴포넌트라 클릭 핸들러를 못 단다. 행 전체를
클라로 내리면 목록 전부가 번들에 실린다. `next/link`를 감싼 `ArticleLink`(클라)로 링크만 바꿨다.
href는 그대로라 크롤러가 따라가는 데는 차이가 없다. 릴스는 슬라이드 인덱스를 그대로 넘긴다. 핫이슈는
사진 카드 뒤에 텍스트 카드 순위가 이어진다(응답 순서 그대로).

## 원문 클릭과 공유

원문 버튼은 `SourceLinkButton`(ui)이 직행 링크와 기자별 팝오버 두 모양이라 둘 다 같은 `onOpen`으로
알린다. 이동은 막지 않는다. 기사 본문(`ArticleBody`, `ArticleMain`)이 서버 컴포넌트라 함수를 prop으로
못 넘겨서, 기사 id만 받아 콜백을 만드는 클라 래퍼(`ArticleSourceLink`)를 두고 릴 세부도 같은 걸 쓴다.
`host`는 `new URL(href).hostname`이다.

공유는 `useCopyLink`의 `copy`가 성공 여부를 돌려주게 바꾸고 `ShareDialog`가 성공했을 때만 보낸다.
팝업을 연 것이 아니라 실제로 복사된 순간이 확산 신호다. `ShareDialog`가 기사 id를 받게 됐다.

## 검증

로컬 BE를 8082에 띄우고 모바일과 웹을 각각 프로덕션 빌드로 붙였다. 처음 3012 포트로 띄우니
`/be/api/v1/events`가 전부 403이었다. BE `CorsFilter`가 Origin을 거절한 것이다. 허용 목록이 3000과
3001뿐이라 3001로 옮겨 다시 띄웠다(`article-views.ts` 주석에 적혀 있던 그 403이다).
`.claude/launch.json`에 8082용 설정을 몇 개 더했다.

BE 로그(`analytics.sender=log`)에서 확인한 것.

- 첫 로드에 `app_entered`, `screen_viewed home`. 브라우저 패널의 첫 로드 이중 요청 때문에 `home`이
  둘 찍혔다(ADR 0161이 본 그 경쟁).
- 피드 두 번째 행을 누르니 `screen_viewed article_detail ref=7806`, `POST /articles/7806/view?rank=1`
  200, 로그에 `article_opened source=view_api feed_rank=1`.
- 원문을 누르니 `outbound_clicked host=x.com`. 뒤로 가니 `home`과 `article_read_finished dwell_ms=39498
reached_end=true`.
- 같은 기사를 다시 열어 `article_opened`가 한 번 더. 클립보드를 성공으로 스텁하고 복사하니
  `reaction reaction_type=share`. 패널에서는 클립보드가 막혀 첫 시도는 실패 안내가 떴고 이벤트가 안
  나갔다. 실패는 안 보내는 게 맞다.
- 홈 팀 탭 `team_hub ref=liverpool`, 릴스 진입 `reels`와 `article_opened feed_rank=0`, 릴을 탭하니
  `reels.detail ref=8032`, 팀 프로필 탭을 바꾸니 `team_profile.figures ref=liverpool`.
- 웹(3000)도 `client=desktop_web`으로 `app_entered`, `home`, `article_detail ref=8032`, `feed_rank=0`,
  `article_read_finished`가 같은 순서로 찍혔다.
- 하드 내비게이션으로 기사를 열고 `history.back()`으로 나가니 `pagehide` 경로로
  `article_read_finished`가 왔다.

경기 상세 탭은 못 봤다. 로컬 BE에 `FOOTBALL_API_KEY`가 없어 경기 API가 502라 경기 상세 페이지 자체가
안 뜬다. 같은 훅을 쓰는 팀 프로필 탭으로 갈음했다.

막힌 데가 하나 있었다. 하드 내비게이션으로 연 기사에서 조회 기록이 안 나가는 것처럼 보였다.
`screen_viewed`는 바로 찍히는데 `/view`가 없었다. 로그 타임스탬프를 보니 안 나간 게 아니라 38초 뒤에
나갔고, 그 시각이 내가 그 탭에 JS를 실행한 순간이었다. 브라우저 패널이 hidden이라 크롬이 타이머를
심하게 묶고(5분 넘게 가려진 탭은 분당 한 번), 루트 레이아웃은 바로 하이드레이션되는데 페이지 트리의
하이드레이션이 그 뒤로 밀려 있다가 JS 실행에 깨어난 것이다. 코드 문제가 아니라 hidden 패널 함정이고,
소프트 내비게이션은 내가 클릭을 넣는 순간 깨어나서 늘 바로 나갔다. 애니메이션 검증 때 본 것과 같은
함정이다.

`reachedEnd`는 패널로는 판정할 수 없었다. hidden 패널은 레이아웃 자체를 안 돌려서
(`getBoundingClientRect`가 전부 0) `IntersectionObserver`가 늘 교차로 나온다. 그래서 iOS 시뮬레이터
Safari로 다시 봤다. 여기서 함정이 하나 더 있었다. 프로덕션 빌드는 토큰 쿠키에 `Secure`가 붙는데
Safari는 크롬과 달리 `http://localhost`를 안전한 컨텍스트로 안 봐서 쿠키를 버린다. 요청마다 게스트가
새로 발급되고(`guest_issued`가 30건 넘게 찍혔다) 이벤트는 토큰이 없어 401로 조용히 떨어졌다. 조회
기록만 비로그인 허용이라 `user=null`로 남았다. dev 서버(`NODE_ENV`가 production이 아니라 `Secure`가
안 붙는다)로 바꾸니 토큰이 실렸고, 홈에서 기사를 열었다 나가니 `article_read_finished
reached_end=true`가 찍혔다. 표식이 실제 브라우저에서 교차를 잡는 건 확인됐다. 다만 false는 못 봤다.
로컬 데이터의 기사가 전부 요약 두 줄에 투표 카드 정도라 iPhone 17 Pro 화면에 본문 끝이 처음부터
들어온다. 그 경우 true가 맞는 값이다. 긴 기사가 있는 dev 데이터로 다시 본다.

`pnpm format:check`, `pnpm lint`, `pnpm check-types`, 두 앱 `next build` 통과.

## 남은 것

- `X-Plick-Entry`의 `hot`, `share_link`. ADR 0161이 이번 작업 몫으로 남겼는데 티켓 할 일에 없어 안
  넣었다. 핫이슈 카드 클릭과 공유 링크 진입을 표시하려면 `ArticleLink`에 진입 화면을 실어 `/be` fetch
  헤더로 넘기면 프록시가 살린다. 다음에 붙인다.
- 경기 상세 탭 이벤트와 `reachedEnd=false`는 dev 배포 뒤 실제 경기와 긴 기사로 다시 본다.
- 검증 중에 34시간 전 세션이 남긴 목 dev 서버(3031)를 내렸다. dev 락 때문에 개발 서버를 하나만 띄울
  수 있어서다. 필요하면 `mobile-dev-mock`으로 다시 띄운다.
- 브라우저 패널 첫 로드 이중 요청으로 `home`이 둘 찍히는 건 패널 문제다. 실제 브라우저에서는 한 번이다.
- 트윗 임베드 안 링크는 전역 CSS로 꺼져 있어(KAN-297) 원문 클릭이 안 나간다. 살리면 그때 붙인다.
- `feed_rank`는 홈 피드, 기사 피드, 핫이슈, 릴스만 싣는다. 관련 기사와 경기 뉴스, 활동 목록은 순위
  없이 부른다.
