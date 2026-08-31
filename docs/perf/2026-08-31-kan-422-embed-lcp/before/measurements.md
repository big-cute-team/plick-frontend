# KAN-422 임베드 LCP 체인 — before 측정 (2026-08-31)

계획은 [ADR 0113](../../../adr/0113-embed-lcp-chain-plan.md). 이 폴더가 챕터(서버 렌더
임베드 → dynamic 전환 → 트윗 fetch 게이팅) 전체의 공통 baseline이다.

## 측정 환경

- 커밋: `bc7665a` (develop, 코드 변경 전. KAN-421 폰트 셀프호스팅 반영된 상태)
- 빌드: `pnpm --filter mobile build` (prod), 실행: standalone `node server.js` (PORT=3001)
- BE: 로컬 Spring (localhost:8080), 릴 30장+ 시드, 전건 `reelsImageUrl` null → react-tweet 임베드 경로
- 상태: 비로그인(익명)
- 도구: Lighthouse 13.4.1 CLI, 모바일 에뮬 + simulated slow 4G(기본), performance 카테고리만,
  headless Chrome. 페이지당 5회, 중앙값 채택
- 명령: `npx lighthouse http://localhost:3001/<path> --only-categories=performance --output=json,html --chrome-flags="--headless=new"`
- 빌드가 새것인지 확인: 서빙 HTML에 jsdelivr 0건(폰트 셀프호스팅 반영), `pbs.twimg.com` preconnect 존재

## Lighthouse (5회 중앙값)

| 페이지   | 성능 점수 | FCP    | LCP    | Speed Index | TBT   |
| -------- | --------- | ------ | ------ | ----------- | ----- |
| `/reels` | 80        | 0.91 s | 5.41 s | 1.66 s      | 4 ms  |
| `/` 홈   | 79        | 1.05 s | 5.93 s | -           | 11 ms |

- LCP 5회 원값: 릴스 5.63/5.48/5.41/5.41/5.41 (중앙값 런 run3), 홈 5.88/6.15/5.78/6.23/5.93
  (중앙값 런 run5). 저장소에는 중앙값 런 리포트만 남기고 원본 20쌍은 `_workspace/perf-raw/kan-422-before/` 보관.
- 0111의 after(릴스 5.70, 홈 6.23)와 런 노이즈(±0.4 s) 범위에서 같다 — 그 사이 커밋으로
  움직인 건 없고, 이번 챕터의 before로 새로 뜬 값이다.

## LCP 요소와 체인 진단 (reels-run3)

- LCP 요소: 첫 릴 트윗 임베드의 미디어 이미지
  (`img.tweet-media-module__*__image`, `pbs.twimg.com/media/*?format=jpg&name=small`)
- lcp-discovery 체크리스트 (이번 챕터가 잡을 대상):
  - `fetchpriority=high` 미적용 (false)
  - initial document에서 발견 불가 (false) — 클라 렌더 + swr 페치 후 삽입
  - `loading=lazy` 아님 (통과)
- lcp-breakdown (observed, 스로틀 전): TTFB 9 ms / resource load delay 533 ms /
  resource load duration 320 ms / element render delay 31 ms.
  load delay가 지배적 — 하이드레이션 → `/api/tweet/{id}` 왕복 → 그제서야 이미지 요청이
  시작되는 체인 그 자체다. simulated slow 4G에서 이 체인이 LCP 5.4 s로 늘어난다.

## 네트워크 (reels-run3, 초기 로드)

- 총 요청 60건
- `/api/tweet/{id}`: 10건 (첫 페이지 릴 10장 전부 마운트 즉시 fetch — #17 게이팅 대상 지표)
- `pbs.twimg.com`: 14건 (미디어 name=small + 프로필 이미지)
- 첫 `/api/tweet` 요청 시작: 101 ms (observed) — 하이드레이션 뒤에야 출발

## TTFB (curl 5회, 익명, 캐시 워밍 후)

`/reels` 4.0~5.6 ms. 서버 렌더 임베드(PR 1)가 여기에 신디케이션 왕복을 얹으면 안 된다는
회귀 감시 기준값.

## 번들

turbopack build 출력에 라우트별 First Load JS 표가 없다(`build-output.txt`).
PR 2(dynamic 전환)의 before/after는 `.next` 클라이언트 청크 gzip 합산으로 잰다 —
감사 리포트 기준선(공유 First Load JS gzip 128 KB, 전체 353 KB) 방식과 동일.
