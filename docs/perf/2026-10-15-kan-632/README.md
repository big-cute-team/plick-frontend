# KAN-632 개선 전 증거 (2026-10-15)

- `prod-headers.txt`: m.plick.co.kr 7개 라우트 응답 헤더. 전부 `no-store`, CloudFront Miss
- `ttfb-before-20.txt`: 게스트 쿠키로 20회 요청한 TTFB p50/p95 (정적 파일 vs 동적 화면)
- `build-before-routes.txt`: develop `next build` 라우트 표. 페이지 라우트 전부 ƒ
- `notRestoredReasons.json`: 크롬 계열에서 기사 → FAQ → 뒤로가기의 bfcache 차단 사유
- `soft-nav-back.txt`: 앱 안 뒤로가기(Link)는 문서가 안 바뀌고 홈 RSC 재요청도 없다
- `alb-sim-timeline.txt`: iOS 시뮬레이터 Safari가 x.com에 다녀온 뒤 `/reels/8294`를 다시 받은 ALB 로그

스크린샷(라이트하우스 bf-cache, 시뮬레이터 3장)은 저장소 밖 `_workspace/2026-10-15-kan-632/blog-assets/`에 있다.
