# KAN-667 증거 (2026-10-23)

웹(apps/web)에 모바일의 렌더링·캐싱 개편 세 건(KAN-632·664·665)을 이식한 작업의 전후 증거다.
회고는 [ADR 0204](../../adr/0204-web-render-cache-port.md)에 있다.

## 착수 전과 단계별 (로컬 standalone)

- `build-before-routes.txt`: develop `next build` 라우트 표. 페이지 라우트 31개 전부 ƒ
- `headers-before-local.txt`: 로컬 standalone(prod BE) 16개 화면 응답 헤더. 전부 `no-store`, 게스트 `Set-Cookie` 8줄
- `build-after-1-routes.txt`·`headers-after-1-local.txt`: 1단계(레이아웃이 요청을 읽지 않게) 뒤
- `build-after-2-routes.txt`·`headers-after-2-local.txt`: 2단계(기사·릴스·투표 익명 ISR) 뒤
- `build-after-3-routes.txt`·`headers-after-3-local.txt`: 3단계(게스트 발급 분리) 뒤. 문서 응답에 `Set-Cookie` 없음
- `e2e-web-local-after-3.txt`: 로컬 standalone을 대상으로 돈 웹 E2E 다섯 개

## prod 배포와 CloudFront 콘솔 적용 뒤 (2026-10-23 14:40~16:00 KST)

main 릴리스(PR develop→main, FE CodeDeploy `plick-frontend-prod` 14:11~14:22 KST 완료)와
CloudFront 기본 비헤이비어 캐시 정책 교체(`plick.co.kr` 14:41:05, `m.plick.co.kr` 14:41:35 KST, 정책
`plick-documents` 6c5e02cc-2ac2-4c70-9c28-5be91c3303ea) 뒤 prod를 다시 잰 것이다.

- `lighthouse-bfcache-prod.tsv`: Lighthouse 12.8.2 CLI `--only-audits=bf-cache`, 모바일은 기본 프로파일, 웹은
  `--preset=desktop`. 홈·FAQ·기사 상세(9679)·릴스·투표·팀 프로필(liverpool) 두 호스트 12 URL을 3회씩, 36회
  모두 통과(score 1, 차단 사유 0건). 2026-10-11 감사는 모바일 18/18, 웹 19/19 실패였다
- `lighthouse-full-prod.tsv`: 같은 12 URL을 전체 카테고리로 3회씩 돌린 결과(06:00~06:12 UTC). 위쪽은 감사 항목 14개
  (bf-cache, errors-in-console, color-contrast, label-content-name-mismatch, image-redundant-alt, target-size,
  heading-order, aria-required-children/parent, unused-javascript, legacy-javascript, uses-text-compression,
  meta-description, meta-viewport)의 화면별 통과 여부와 실패 한 줄, 아래쪽은 성능·접근성·Best Practices·SEO 점수와
  LCP(시뮬·실측) 중앙값. 2026-10-11 감사 티켓(KAN-624~643) 대조용이다. 원본 JSON 72개는 저장소 밖에 뒀다
- `prod-headers-after-cdn.txt`: 브라우저 UA로 같은 문서를 두 번 요청한 응답 헤더(홈·FAQ·기사·릴스·투표·팀 프로필·
  MY·로그인, 두 호스트). 정적·ISR 문서는 두 번째 요청이 전부 `Hit from cloudfront`(홈·FAQ·릴스·투표는 첫 요청부터 Hit),
  MY·로그인은 `private, no-store`에 두 번 다 Miss. 32개 응답 어디에도 `Set-Cookie`가 없다
- `prod-article-states.txt`: 두 호스트에서 `POST /api/session/guest`로 게스트 하나를 받아
  `GET /be/api/v1/users/me/article-states?ids=9679`를 부른 결과. 둘 다 200이다. BE KAN-663이 같은 날 14:17 KST
  `plick-main-prod`로 prod에 들어갔다(그 전 사설 ALB 로그는 404)
- `alb-buckets.tsv`: prod 공용 ALB(`plick-alb-pub-prod`)와 사설 ALB(`plick-alb-pri-prod`) 액세스 로그를 10분 단위로
  센 것. 열은 호스트별 문서 요청(`/be`·`/_next`·`/api`·확장자 있는 경로 제외, 괄호는 그중 봇 UA), 브라우저의 게스트
  발급 `POST /api/session/guest`, 내 측정 요청(Lighthouse·curl UA, 제외), BE로 간 `POST /api/v1/auth/guest`,
  `article-states` 호출이다. 공용 ALB 로그의 클라이언트 IP는 CloudFront 엣지라 내 요청은 UA로 뺐다

측정 중 prod BE에 좋아요·투표는 남기지 않았다. Lighthouse가 띄운 화면이 한가할 때 받은 게스트 계정과 curl로 받은 게스트 둘은
남는다.

## ALB 전후 한 시간 (UTC, 콘솔 적용 05:41 기준)

| 구간           | 문서 요청 m.plick(그중 봇) | 문서 요청 plick(그중 봇) | BE `POST /api/v1/auth/guest` | 내 측정 요청(제외) |
| -------------- | -------------------------- | ------------------------ | ---------------------------- | ------------------ |
| 전 04:40~05:40 | 313 (140)                  | 264 (66)                 | 8                            | 0                  |
| 후 05:40~06:40 | 539 (268)                  | 670 (272)                | 79                           | 1997               |

문서 요청 수는 줄지 않았고 읽을 수 있는 비교가 못 됐다. 후 구간에 내 Lighthouse 72회(전체 감사 36회 포함)가 겹쳐 있고 06:20·06:30에
크롤러 버스트(모바일 211, 웹 226)가 들어왔기 때문이다. 게스트 발급 79건 중 대부분은 Lighthouse가 띄운 화면이 한가할 때 받은 것이다.
깨끗한 비교는 측정이 없는 날의 같은 시간대로 다시 해야 한다.
