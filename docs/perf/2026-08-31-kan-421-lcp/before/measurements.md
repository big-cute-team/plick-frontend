# KAN-421 LCP 개선 — before 측정 (2026-08-31)

## 측정 환경

- 커밋: `932f814` (develop, 코드 변경 전)
- 빌드: `pnpm --filter mobile build` (prod), 실행: standalone `node server.js` (PORT=3001)
- BE: 로컬 Spring (localhost:8080), 릴 30장+ 시드, 전건 `reelsImageUrl` null → react-tweet 임베드 경로
- 상태: 비로그인(익명)
- 도구: Lighthouse 13.4.1 CLI, 모바일 에뮬 + simulated slow 4G(기본), performance 카테고리만,
  headless Chrome. 페이지당 5회, 중앙값 채택
- 명령: `npx lighthouse http://localhost:3001/<path> --only-categories=performance --output=json,html --chrome-flags="--headless=new"`

## Lighthouse (5회 중앙값)

| 페이지   | 성능 점수 | FCP    | LCP     | Speed Index | TBT  |
| -------- | --------- | ------ | ------- | ----------- | ---- |
| `/` 홈   | 75        | 1.53 s | 14.89 s | 1.53 s      | 0 ms |
| `/reels` | 74        | 1.39 s | 14.75 s | 2.42 s      | 0 ms |

- 5회 원값(LCP): 홈 15.75/14.70/14.81/15.30/14.89, 릴스 14.75/14.67/14.64/14.83/14.91.
  저장소에는 중앙값 런(home-run5, reels-run1) 리포트만 남기고 나머지는 `_workspace/perf-raw/` 보관.
- run1은 두 페이지 모두 FCP 11.6~11.7 s로 아웃라이어 — jsdelivr 첫 연결(DNS+TLS)이 콜드라
  렌더 블로킹 CSS 완료가 그만큼 밀린 것. 이후 런은 FCP 1.4~1.5 s. LCP는 전 런 14.6~15.7 s로 일관.

## LCP 요소와 진단 (Lighthouse insight)

- 두 페이지 모두 LCP 요소는 react-tweet 임베드의 미디어 이미지
  (`img.tweet-media-module__*__image`, `pbs.twimg.com/media/*`).
- lcp-discovery 체크리스트: `fetchpriority=high` 미적용, 초기 HTML 문서에서 발견 불가
  (클라이언트 렌더 + swr 페치 후 삽입).
- render-blocking-insight: Pretendard CSS(jsdelivr)가 렌더 블로킹, 추정 절감 845 ms (reels run2).
- lcp-breakdown(reels run2, observed): TTFB 13 ms / resource load delay 756 ms /
  resource load duration 473 ms.

## 폰트 (핵심 병목)

- `layout.tsx`(모바일 109-112행, 웹 동일)에서 jsdelivr `pretendardvariable.min.css`를 동기
  `<link rel="stylesheet">`로 로드 — 렌더 블로킹, preconnect 없음.
- CSS(1.1 KB) → `PretendardVariable.woff2` 2,058,735 B (약 2.0 MB) 2단 폭포수.
  한글 전 글리프 + variable 축 풀 세트. `font-display: swap`은 있음.
- reels run2 네트워크 실측: CSS 38→130 ms, woff2 146→319 ms(observed, 스로틀 전) —
  simulated slow 4G에선 이 2 MB가 대역폭을 독점해 트윗 이미지(LCP)를 뒤로 민다.
- `pbs.twimg.com` preconnect 없음 — 트윗 이미지 첫 요청 시작이 615 ms(run2 observed).

## TTFB (curl 5회 중앙값, 익명, 로컬)

| 경로     | TTFB   |
| -------- | ------ |
| `/faq`   | 4.2 ms |
| `/`      | 5.3 ms |
| `/reels` | 4.3 ms |

익명 GET Data Cache가 워밍된 상태 기준. 콜드 첫 히트는 `/faq` 78 ms, `/reels` 260 ms.
(동적 렌더·TTFB 개선은 감사 리포트 2번 덩어리 — 이번 범위 아님, 기준값만 기록)

## 번들 (build-output.txt)

- 라우트 22개 전부 동적(ƒ). 공유 First Load JS 등 상세는 `build-output.txt` 원문 참조.

## 개선 후보 대응 (감사 리포트 #1~#4)

1. 첫 슬라이드 `loading="eager"` + `fetchPriority="high"` (#1)
2. Pretendard `next/font/local` 셀프호스팅 — Std 서브셋 variable 291,680 B(285 KB), 풀 폰트 대비 1/7 (#2)
3. `pbs.twimg.com` preconnect (#3)
4. 홈 히어로 5장 fetchPriority 차등 (#4)
