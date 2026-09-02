# KAN-426 팀 크레스트 리사이즈 — after 측정 (2026-08-31)

측정 조건은 [before/measurements.md](../before/measurements.md)와 동일
(prod standalone, 로컬 BE, 익명, Lighthouse 13.4.1 모바일 에뮬 + simulated slow 4G,
5회 중앙값). before는 [after-server-embed](../after-server-embed/measurements.md)의
run4다 — 그 측정 이후 develop에 코드 변경이 없어(문서·머지 커밋뿐) 재측정 없이
체인을 이었다. 중앙값 런(run1)만 남기고 원본 5쌍은 `_workspace/perf-raw/kan-426-after/` 보관.

## Lighthouse (5회 중앙값)

| 페이지   | 성능 점수 | FCP    | LCP    |
| -------- | --------- | ------ | ------ |
| `/reels` | 82        | 1.06 s | 4.81 s |

- LCP 5회 원값: 4.80/4.81/4.81/5.11/5.11 (before: 4.96/5.03/5.03/5.03/5.33)
- LCP 5.03 → 4.81 s (−4%). FCP 1.06 → 1.06 s 동일

## 소유 지표 — 초기 이미지 전송량 (reels-run1)

| 항목                       | before   | after    |
| -------------------------- | -------- | -------- |
| 크레스트 webp 전송량 (5장) | 136.8 KB | 49.3 KB  |
| 이미지 전체 전송량 (21건)  | 630.9 KB | 542.6 KB |
| 페이지 총 전송량           | 1,204 KB | 1,116 KB |

에셋 원본은 6장 합계 136.6 → 54.8 KB (긴 변 468px급 → 160px, q80). 렌더 최대가
모바일 51px·웹 40px라 3x에도 여유가 있다.

## LCP breakdown (observed)

| 단계                   | before | after  |
| ---------------------- | ------ | ------ |
| resource load delay    | 19 ms  | 27 ms  |
| resource load duration | 633 ms | 606 ms |
| element render delay   | 34 ms  | 34 ms  |

load duration이 소폭 줄었다. 크레스트는 LCP 이미지와 같은 43ms대에 출발하던 Low
우선순위 경합원이라, 88 KB를 빼면 simulated slow 4G(약 1.6Mbps ≈ 200KB/s)에서
산술상 0.4초쯤의 파이프가 비지만 브라우저가 그 대역폭을 남은 요청(폰트·JS·다른 릴
이미지)에 재배분하므로 LCP 몫은 그중 일부다. 남은 최대 경합원은 폰트 285 KB(High,
LCP 이미지와 같은 34ms 출발)와 화면 밖 릴의 트윗 이미지 ~420 KB — 각각 다음 PR
(폰트 동적 서브셋, fetch 게이팅)의 몫이다.
