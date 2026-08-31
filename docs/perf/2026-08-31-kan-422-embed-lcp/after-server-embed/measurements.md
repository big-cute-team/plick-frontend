# KAN-422 서버 렌더 임베드 — after 측정 (2026-08-31)

측정 조건은 [before/measurements.md](../before/measurements.md)와 동일
(prod standalone, 로컬 BE, 익명, Lighthouse 13.4.1 모바일 에뮬 + simulated slow 4G,
5회 중앙값). 대상은 변경이 있는 `/reels`만 — 홈은 이 PR에서 손대지 않았다.
중앙값 런(run4) 리포트만 남기고 원본은 `_workspace/perf-raw/kan-422-after/` 보관.

## Lighthouse (5회 중앙값)

| 페이지   | 성능 점수 | FCP    | LCP    | TBT  |
| -------- | --------- | ------ | ------ | ---- |
| `/reels` | 81        | 1.06 s | 5.03 s | 7 ms |

- LCP 5회 원값: 4.96/5.03/5.03/5.03/5.33 (before: 5.63/5.48/5.41/5.41/5.41)
- LCP 5.41 → 5.03 s (−7%). FCP 0.91 → 1.06 s (+0.15 s, 문서 +3.3 KB — 임베드 SSR 마크업
  - RSC payload 몫)

## 구조 지표 — 이 PR의 목적 (reels-run4)

| 항목                                     | before | after            |
| ---------------------------------------- | ------ | ---------------- |
| lcp-discovery: initial document에서 발견 | ✗      | ✓                |
| lcp-discovery: fetchpriority=high        | ✗      | ✓ (preload link) |
| resource load delay (observed)           | 533 ms | 19 ms            |
| LCP 이미지 요청 시작 (observed)          | 542 ms | 34 ms (High)     |
| 초기 `/api/tweet` 요청 수                | 10     | 9 (첫 릴 생략)   |

체인 앞 단계(하이드레이션 → 클라 fetch → 이미지 발견)가 서버로 넘어와 load delay가
사실상 사라졌다. 남은 LCP는 load duration(633 ms observed) — simulated slow 4G에서
폰트 292 KB + JS 232 KB + 나머지 릴 9장의 트윗 fetch·이미지와 대역폭을 나누는 비용이다.
이게 다음 두 PR(#12·#13 dynamic 전환, #17 fetch 게이팅)이 갖는 몫이다.

## TTFB 회귀 확인

`/reels` 6~12 ms (before 4~6 ms 동등 수준). `getTweet` 서버 호출은 `unstable_cache`
하루 캐시라 웜 요청에 신디케이션 왕복이 얹히지 않는다. 콜드(캐시 미스) 첫 요청만
왕복 1회를 진다.
