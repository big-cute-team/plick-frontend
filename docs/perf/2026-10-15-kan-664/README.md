# KAN-664 개선 후 증거 (2026-10-15, 로컬 standalone)

개선 전은 KAN-632의 개선 후 증거(`../2026-10-15-kan-632/`)다. 기사·릴스·투표가 ƒ, 응답이 `no-store`, 기사 `bf-cache` 실패.

브랜치 빌드를 워크트리에서 standalone으로 띄우고(`127.0.0.1:3101`), `API_BASE_URL`을 검증용 node 프록시(8093)로 돌렸다. 프록시는 읽기를 prod BE로 넘기고, 아직 prod에 없는 `GET /users/me/article-states`와 좋아요·투표 쓰기만 메모리에서 흉내 내며 호출을 전부 적는다. BE 실계약은 `be-verify`가 KAN-663 브랜치를 로컬 8082에 띄워 따로 확인했다(차이 없음).

- `build-after-routes.txt`: `/articles/[postId]`·`/reels/[postId]` ●, `/reels`·`/debates` ○ 1m
- `headers-after-local.txt`: 네 화면 `s-maxage=60, stale-while-revalidate=…`, 두 번째 요청부터 `x-nextjs-cache: HIT`. `/me`는 그대로 `no-store`
- `lighthouse-bfcache-after-local.txt`: Lighthouse 12.8.2 `bf-cache` 점수. 네 화면 모두 1(통과)
- `state-calls-local.txt`: 내 상태 조회 로그. 릴스 첫 화면 10장이 `n=10` 한 번, 투표 목록 2장이 `n=2` 한 번, 기사 상세는 `n=1`. 댓글은 브라우저가 토큰을 실어 받는다

prod 배포(BE PR #188 dev 배포 포함) 뒤 같은 방법으로 다시 잰다. 시뮬레이터에서 릴스 → x.com → 뒤로가기 후 ALB 로그에 문서 재요청이 없는지, 하트가 채워지는 시점(상태 조회 왕복)이 실제 망에서 얼마인지.
