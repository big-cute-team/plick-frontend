# 0111. KAN-421 — LCP 개선기: 폰트 셀프호스팅과 fetchPriority (2026-08-31)

성능 감사 리포트([2026-08-31-performance-audit.md](../audits/2026-08-31-performance-audit.md))의
1번 덩어리(#1~#4)를 실행한 세션이다. 포트폴리오용 "수치 X → Y" 작업이라 코드보다 측정을
먼저 설계했고, 근거 파일을 전부 `docs/perf/2026-08-31-kan-421-lcp/`에 남겼다.

## 증거를 남기는 방식부터 정했다

이번 작업의 산출물은 코드 diff가 아니라 "before → after 수치"다. 그래서 규칙을 먼저 세웠다.

- 증거 폴더를 저장소 안에 둔다: `docs/perf/2026-08-31-kan-421-lcp/{before,after-font,after}/`.
  각 단계에 Lighthouse JSON+HTML 원본, 측정 조건과 중앙값을 적은 `measurements.md`를 넣는다.
  측정 시점 커밋 해시를 같이 적어 누구든 재현할 수 있게 했다.
- 4개 항목을 한 번에 고치지 않고 두 단계로 쪼갰다. 1단계 폰트 셀프호스팅(#2)+preconnect(#3),
  2단계 첫 슬라이드·히어로 fetchPriority(#1, #4). 단계마다 같은 조건으로 다시 재서
  "어떤 변경이 얼마를 움직였는지"를 귀속시켰다. 한 번에 고치면 합산 수치밖에 안 남는다.
- 측정은 dev 서버가 아니라 prod 빌드로 한다. dev는 컴파일 온디맨드라 수치가 무의미하다.

## prod 빌드를 로컬에서 띄우는 것부터 막혔다

`pnpm --filter mobile build` 후 `pnpm start`를 했더니
"`next start` does not work with `output: standalone`"이라며 죽었다. 이 저장소는 배포를
standalone 산출물로 하기 때문에(`next.config`의 `output: "standalone"`) 로컬도 배포와 같은
방식으로 띄워야 했다: `.next/static`과 `public/`을 standalone 폴더에 복사하고
`PORT=3001 node .next/standalone/apps/mobile/server.js`. 모노레포라 server.js가
`standalone/apps/mobile/` 아래에 있다는 것도 처음 알았다.

중간에 한 번 더 당했다. 1단계 코드를 넣고 재빌드했는데 서버 HTML에 jsdelivr 링크가
그대로 있었다. 알고 보니 이전 서버 프로세스가 안 죽고 :3001을 계속 잡고 있었고, 새 서버는
`EADDRINUSE`로 기동에 실패한 채 나는 옛 빌드를 측정하고 있던 거다. 그 뒤로는 재기동 때마다
`lsof`로 리스너 PID를 확인하고 죽인 다음 띄웠다. 단계별 측정에서 "지금 서버가 어느 빌드인가"를
확인하지 않으면 수치 전체가 무효가 된다 — HTML에서 변경 흔적(jsdelivr 유무)을 grep해서
빌드 버전을 확인하는 습관이 이번에 생겼다.

## before: 진짜 병목은 폰트 2MB였다

Lighthouse(13.4.1, 모바일 에뮬 + simulated slow 4G, 페이지당 5회 중앙값) 기준:

| 페이지   | 점수 | FCP    | LCP     |
| -------- | ---- | ------ | ------- |
| `/`      | 75   | 1.53 s | 14.89 s |
| `/reels` | 74   | 1.39 s | 14.75 s |

LCP 14~15초. 붙잡고 있는 건 감사 때 짚었던 대로 폰트였는데, 실측해 보니 구조가 더 나빴다.

- `layout.tsx`가 jsdelivr의 `pretendardvariable.min.css`를 동기 `<link rel="stylesheet">`로
  로드한다. 렌더 블로킹이고(Lighthouse 추정 845ms), preconnect도 없어서 콜드 연결이면
  DNS+TLS까지 전부 첫 페인트 앞에 선다. 실제로 5회 중 1회(첫 런)는 FCP가 11.7초까지
  튀었다 — jsdelivr 첫 연결이 콜드였던 런이다. 외부 오리진 의존은 수치의 분산까지 키운다.
- 그 CSS는 405바이트짜리인데, 안에서 `../../../packages/pretendard/...` 상대경로로
  `PretendardVariable.woff2` 2,058,735바이트(약 2.0MB)를 가리킨다. 한글 전 글리프
  variable 폰트 통짜다. CSS → woff2 2단 폭포수에, slow 4G에서 이 2MB가 대역폭을 독점한다.
- LCP 요소는 두 페이지 모두 릴/히어로의 트윗 임베드 이미지(`pbs.twimg.com`)였다.
  발행 릴 전건이 `reelsImageUrl` null이라 미디어가 react-tweet 임베드 경로로만 온다.
  이미지 자체는 수십 KB인데, 폰트 2MB가 앞에서 파이프를 다 먹으니 LCP가 14초까지 밀렸다.
  "폰트 문제"가 "이미지 LCP"로 전이되는 구조다.

## 1단계: next/font/local 셀프호스팅 (#2, #3)

`next/font/local`로 바꿨다. jsdelivr 링크를 지우고 layout에서 폰트를 선언하면
빌드가 woff2를 `/_next/static/media/`로 가져가고, React 스트리밍 리소스 힌트로
preload가 자동으로 나간다. `font-display: swap`과 사이즈 조정된 fallback도 자동이다.
배포에선 `/_next/static`이 CloudFront immutable 캐시를 그대로 탄다(ADR 0081).

파일은 통짜 대신 Std 서브셋(`PretendardStdVariable.woff2`, KS X 1001 완성형 기반
2,780자, 291,680바이트)을 골랐다. 2.0MB → 285KB, 1/7이다. 트레이드오프가 있다:

- Pretendard가 공식 배포하는 dynamic subset(유니코드 레인지로 2,700여 조각을 쪼개
  화면에 쓰인 글리프만 받는 방식)이 전송량 면에선 더 정교하지만, `next/font`는
  unicode-range 다중 파일 선언을 지원하지 않는다. CSS를 직접 쓰면 되지만 그러면
  preload·fallback 자동화를 버려야 한다.
- Std 서브셋 밖 희귀 음절(옛한글이나 "뷁" 같은 완성형 밖 조합)은 fallback 시스템 폰트로
  표시된다. 닉네임·댓글에 드물게 섞일 수 있는데, 본문이 깨지는 게 아니라 그 글자만
  시스템 폰트로 뜨는 정도라 감수했다.

폰트 패밀리 연결은 CSS 변수로 풀었다. `next/font`는 해시 붙은 고유 패밀리명을 만들기
때문에 토큰 패키지의 `"Pretendard Variable"` 하드코딩이 더는 안 맞는다. layout이
`variable: "--font-pretendard"`로 변수를 노출하고 `<html>`에 클래스를 달면,
`@plick/tokens`의 `--font-sans`가 `var(--font-pretendard, system-ui)`로 읽는다.
토큰 패키지는 앱이 어떤 폰트를 쓰는지 몰라도 되는 구조가 됐다.

같은 커밋에 `pbs.twimg.com` preconnect(#3)도 넣었다. 트윗 이미지가 LCP인 서비스인데
그 오리진 연결을 이미지 발견 시점에야 열고 있었다.

측정 결과(5회 중앙값):

| 페이지   | 점수    | FCP           | LCP                   |
| -------- | ------- | ------------- | --------------------- |
| `/`      | 75 → 79 | 1.53 → 1.06 s | 14.89 → 5.78 s (−61%) |
| `/reels` | 74 → 80 | 1.39 → 0.91 s | 14.75 → 5.41 s (−63%) |

폰트 요청은 observed 기준 39ms에 시작해 43ms에 끝난다(같은 오리진 + preload).
before의 CSS 폭포수(38→130ms) 뒤 woff2(146→319ms)와 비교하면 요청 수 −1,
전송량 −1.77MB다. 외부 오리진이 사라지니 런 간 분산도 사라졌다 — after는 5회가
전부 ±0.4초 안에 모인다.

## 2단계: 첫 슬라이드·히어로 fetchPriority (#1, #4)

- 릴스: 화면에 보이는 릴(`active`, 첫 진입 시 index 0)의 사진을
  `loading="eager"` + `fetchPriority="high"`로. 나머지는 lazy 유지. 웹은 `active` 개념이
  없어 `eager` prop을 만들어 `ReelViewer`가 `i === 0`에만 준다.
- 홈 히어로 캐러셀: 5장 전부 eager 동순위이던 것을 첫 카드만 `high`, 나머지 `low`로.
  eager 자체는 무한 루프 복제 카드의 빈칸 방지라 유지한다(KAN-382).

이 단계는 Lighthouse 수치가 움직이지 않았고, 그게 정상이다. 현재 발행 데이터 전건이
`imageUrl` null이라 이 코드 경로(사진 릴·사진 히어로)가 아예 렌더되지 않는다.
LCP는 여전히 트윗 임베드 이미지고, 그건 react-tweet가 클라에서 그리는 DOM이라
fetchPriority를 서버 HTML로 힌트할 수 없다. 즉 #1·#4는 "사진 있는 데이터가 들어오면
발동하는" 잠재 개선으로 남는다. 수치로 증명 못 하는 항목을 수치로 증명한 척하지 않기로
했다 — 검증은 코드 경로와 타입, 사진 데이터가 생겼을 때의 DOM 속성 확인으로 한다.

## 측정을 한 번 통째로 버렸다

최종(after) 측정에서 릴스 LCP가 5회 중 3회 1.5초로 갑자기 떨어졌다. 좋아진 게 아니라
깨진 거였다. 리포트에 내장된 final-screenshot을 열어 보니 페이지가 스타일 없이 릴
목록만 세로로 나열된 무스타일 화면이었고, 네트워크 기록엔 트윗 요청이 0건이었다.
원인은 나였다 — 측정이 도는 동안 검증용 전체 빌드(`pnpm build`)를 병렬로 돌렸는데,
빌드가 `.next`를 통째로 재생성하면서 정적 청크 해시가 바뀌었고, 떠 있던 standalone
서버는 옛 해시를 참조하는 HTML에 새 파일 시스템을 물려 CSS·JS가 404가 났다.
글자만 그려진 페이지는 LCP가 빨라 보인다. "수치가 좋아졌는데 이유를 모르겠으면
먼저 의심한다"를 실감한 대목이다. after 10회를 전부 버리고, 서버를 새 산출물로
재구성해 CSS 청크가 200인 걸 확인한 뒤 아무것도 병렬로 돌리지 않고 다시 쟀다.
스크린샷이 리포트에 같이 남는 게 이럴 때 생명이다 — 수치만 봤으면
"릴스 100점"을 그대로 믿을 뻔했다.

## 결과 요약

최종(after, 두 단계 합산) 중앙값과 비교표는
[docs/perf/2026-08-31-kan-421-lcp/](../perf/2026-08-31-kan-421-lcp/)의 `results.md`에 있다.
핵심 수치: LCP 홈 14.89 → 6.23 s (−58%), 릴스 14.75 → 5.70 s (−61%), 폰트 전송량
2.06 MB → 292 KB (−86%). 움직인 건 전부 1단계(폰트)다.

## 남은 것

- LCP 5.4초의 다음 병목은 폰트가 아니라 "트윗 임베드가 클라 렌더 + swr 페치 후에야
  이미지 요청을 시작한다"는 구조다(resource load delay ~540ms + simulated 4G의 이미지
  다운로드). 감사 리포트 #12(코드 스플리팅)·#17(화면 밖 트윗 페치)과 얽혀 있어
  다음 덩어리에서 본다.
- 사진 있는 시드 데이터로 #1·#4 경로의 DOM 검증.
- `apps/mobile/app/fonts/Geist*.woff` 미참조 파일은 감사 #20(저비용 정리) 몫으로 남겨 뒀다.
