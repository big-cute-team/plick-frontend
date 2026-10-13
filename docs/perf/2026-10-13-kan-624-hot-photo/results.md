# KAN-624 측정 (2026-10-13)

# prod 개선 전 (모바일)

Lighthouse 12.8.2 CLI, 기본 모바일 프로파일(Moto G Power, 시뮬 4G, CPU 4배), `--headless=new`, 비로그인, 3회.
그날 핫이슈 사진 카드는 3장이었다(10월 11일 감사 때는 4장).

| 런        | Perf | FCP  | LCP  | LCP 실측 | TTFB | 로드 지연 | 로드  | 렌더 지연 | 사진 전송 | 리사이즈 절감 추정 |
| --------- | ---- | ---- | ---- | -------- | ---- | --------- | ----- | --------- | --------- | ------------------ |
| home-1    | 76   | 1.0s | 7.3s | 2.0s     | 639  | 993       | 5,585 | 60        | 952KiB    | 974KiB             |
| home-2    | 66   | 3.0s | 7.7s | 3.9s     | 628  | 0         | 7,065 | 27        | 955KiB    | 974KiB             |
| home-3    | 75   | 1.0s | 7.9s | 3.9s     | 629  | 0         | 7,242 | 15        | 955KiB    | 974KiB             |
| teamhub-1 | 67   | 2.9s | 8.1s | 2.5s     | 631  | 2,090     | 2,190 | 3,161     | 952KiB    | 978KiB             |
| teamhub-2 | 66   | 2.9s | 7.6s | 2.7s     | 632  | 57        | 6,902 | 32        | 955KiB    | 978KiB             |
| teamhub-3 | 76   | 0.9s | 7.5s | 1.5s     | 628  | 367       | 6,372 | 101       | 954KiB    | 978KiB             |

중앙값: 홈 LCP 7.7s(home-2), 팀 허브 LCP 7.6s(teamhub-2). 사진 3장 955KiB, LCP 요소는 두 화면 다
`pbs.twimg.com/media/HUXzRRXXUAEspVd.jpg?name=large`(1028×852, 185KiB, 표시 170×141).

리포트 캡처(중앙값 런)는 `_workspace/2026-10-13-kan-624/blog-assets/before/`(로컬), 원본 JSON·HTML은 세션
스크래치패드 `lh/before/`에 두고 저장소에는 넣지 않았다.

# 로컬 prod 빌드 전후 (같은 기계, prod BE, 트위터 CDN)

develop(전)과 이 브랜치(후)를 각각 `API_BASE_URL=https://plick.co.kr/be pnpm --filter mobile build` 뒤
`next start` 3061로 띄우고 Lighthouse CLI를 돌렸다. 홈 핫이슈 사진 3장, LCP 요소는 동일 사진.

## 시뮬레이티드 스로틀링 (기본, Lantern)

| 런        | 전 Perf | 전 LCP | 전 실측 LCP | 전 사진 | 후 Perf | 후 LCP | 후 실측 LCP | 후 사진 |
| --------- | ------- | ------ | ----------- | ------- | ------- | ------ | ----------- | ------- |
| home-1    | 78      | 6.0s   | 1.1s        | 952KiB  | 77      | 6.5s   | 1.1s        | 170KiB  |
| home-2    | 78      | 6.1s   | 1.1s        | 952KiB  | 79      | 5.6s   | 0.8s        | 170KiB  |
| home-3    | 78      | 6.0s   | 1.4s        | 953KiB  | 79      | 5.6s   | 1.0s        | 170KiB  |
| teamhub-1 | 76      | 7.4s   | 2.1s        | 953KiB  | 78      | 6.1s   | 0.7s        | 170KiB  |
| teamhub-2 | 76      | 7.4s   | 1.8s        | 952KiB  | 80      | 5.4s   | 0.8s        | 170KiB  |
| teamhub-3 | 78      | 6.1s   | 1.5s        | 954KiB  | 79      | 5.6s   | 0.8s        | 170KiB  |

중앙값: 홈 LCP 6.0s → 5.6s, 팀 허브 7.4s → 5.6s. 사진 952KiB → 170KiB(−82%). 실측 LCP 홈 1.1s → 0.9s.
시뮬 LCP가 5초대에 남는 건 322KiB 폰트가 같은 순간 High로 출발해 시뮬 대역폭을 나눠 쓰기 때문이다(KAN-629).

## devtools 스로틀링 (실제 대역폭 제한, 홈만)

`--throttling-method=devtools`. 시뮬 4G와 같은 수치(1.6Mbps, RTT 150ms, CPU 4배)를 크롬에 실제로 건다.

| 런     | 전 Perf | 전 LCP | 전 사진 로드 | 후 Perf | 후 LCP | 후 사진 로드 |
| ------ | ------- | ------ | ------------ | ------- | ------ | ------------ |
| home-1 | 76      | 6.8s   | 6.2s         | 92      | 3.3s   | 2.7s         |
| home-2 | 76      | 6.9s   | 6.3s         | 92      | 3.4s   | 2.8s         |
| home-3 | 76      | 7.0s   | 6.4s         | 90      | 3.5s   | 2.9s         |

중앙값: LCP 6.9s → 3.4s(−51%), 성능 76 → 92, LCP 사진 로드 6.3s → 2.8s.

after 리포트가 "이미지 크기 적절하게"에 189KiB를 더 남긴 건 기본 에뮬레이션(Moto G Power)이 DPR 1.75라서다.
주 사용 기기는 DPR 3(510px 필요)이라 `small`(680)을 유지한다. iPhone 17 Pro 시뮬레이터 캡처는
`_workspace/2026-10-13-kan-624/blog-assets/simulator-iphone17pro-after.png`.

# prod 재측정

배포 뒤 같은 CLI로 홈·팀 허브 3회 중앙값을 다시 재서 여기 붙인다.

# 로고·아이콘 (KAN-625 흡수)

| 파일                                          | 전       | 후                                                           |
| --------------------------------------------- | -------- | ------------------------------------------------------------ |
| `/brand/logo-horizontal.png` (헤더, 전 화면)  | 39.0KiB  | webp 96 10.6KiB · 134 15.1KiB · 201 23.9KiB, srcset으로 선택 |
| `/icon.png` (매니페스트·파비콘 링크, 전 화면) | 152.6KiB | 37.3KiB (팔레트 품질 65)                                     |
| `/apple-icon.png`                             | 21.9KiB  | 7.3KiB                                                       |
| `/favicon.ico`                                |          | 1.9KiB                                                       |

디자이너가 준 SVG 두 종은 PNG를 base64로 감싼 것이라 벡터 전환은 불가. 크레스트(158×160)는 팀 프로필 88px 자리가 있어 그대로.

# 크레스트 (구단 공식 SVG에서)

| 팀  | 전 160px | 후 132px (`{code}.webp`) | 후 290px (`{code}-290.webp`) | OG PNG 512 전 → 후 |
| --- | -------- | ------------------------ | ---------------------------- | ------------------ |
| ars | 7.0KB    | 5.8KB                    | 14.8KB                       | 84KB → 26KB        |
| che | 13.5KB   | 8.0KB                    | 21.6KB                       | 101KB → 37KB       |
| liv | 10.4KB   | 8.1KB                    | 24.7KB                       | 92KB → 41KB        |
| mci | 8.9KB    | 7.8KB                    | 21.4KB                       | 117KB → 34KB       |
| mun | 11.2KB   | 9.6KB                    | 24.7KB                       | 108KB → 40KB       |
| tot | 5.0KB    | 4.0KB                    | 10.4KB                       | 32KB → 16KB        |

# public 캐시 헤더

prod 실측(2026-10-13): `/_next/static/*` max-age 1년 immutable, CloudFront Hit. `/teams/*`·`/brand/*` `public, max-age=0` Miss.
`/icon.png` `max-age=0, must-revalidate`. 로고·크레스트 webp는 `@plick/ui` import 자산으로 옮겨 `/_next/static/media/<해시>`(S3+CloudFront 1년 immutable)로 나간다.
`/icon.png`·`/apple-icon.png`만 두 앱 `next.config.js` `headers()`로 `max-age=86400, stale-while-revalidate=604800`.
