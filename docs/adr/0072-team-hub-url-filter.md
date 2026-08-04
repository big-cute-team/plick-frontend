# 0072. 팀 허브 URL과 필터의 URL 승격 (KAN-350)

2026-08-04. SEO 전략(KAN-345, [seo-strategy.md](../seo-strategy.md)) Step 2-2의 팀 허브
`/teams/[slug]`를 web·mobile 양쪽에 만들었다. 결과만 보면 라우트 두 개 추가지만, 실제로
한 일의 대부분은 "팀 필터의 원본을 zustand에서 URL로 옮기는" 작업이었다.

## 왜 팀 허브인가

"토트넘 이적 루머"를 검색한 사람을 받아줄 URL이 지금 서비스에 없다. 홈에 팀 필터 탭이
있긴 한데 이건 zustand 클라 상태라서, 토트넘 탭을 골라도 URL은 `/` 그대로다. 구글 크롤러는
탭을 클릭해 주지 않는다. URL을 fetch해서 나온 HTML을 읽을 뿐이다. 그러니 팀별 화면에
도달할 방법 자체가 없었다.

여기서 제약이 하나 있었다. 기존 UX·UI를 바꾸면 안 된다. 팀 허브라고 팀 컬러 헤더를 얹은
새 화면을 만들면 홈에서 탭을 고르는 경험과 갈라진다. 그래서 방향을 이렇게 잡았다. 팀 허브는
홈 화면 그 자체다. 홈에서 토트넘 탭을 고른 상태와 `/teams/tottenham`을 직접 연 상태가
픽셀 하나 다르지 않아야 한다.

## pushState만으로는 안 되는 이유

처음 아이디어는 "탭을 누르면 새로고침 없이 URL만 바뀌게 하자"였다. 방향은 맞는데,
`history.pushState`만 있고 서버 라우트가 없으면 SEO 관점에서는 아무 일도 안 일어난다.
크롤러가 `/teams/tottenham`을 fetch했을 때 200과 함께 토트넘 기사가 담긴 HTML이 나와야
하고, 그 URL로 가는 `<a href>`가 어딘가에 있어야 발견된다. 그래서 세 가지가 한 세트다.

1. `/teams/[slug]`가 실존하는 서버 라우트로 있고, 그 팀의 기사 목록을 서버 렌더한다.
2. 팀 필터 탭이 `<button>`이 아니라 그 URL로 가는 `<a>`다. 크롤러용 내부 링크.
3. 사용자 클릭은 가로채서 `history.replaceState`로 URL만 바꾼다. 리마운트도 서버 왕복도
   없는 기존 필터 UX 그대로.

이렇게 하면 pushState로 URL이 바뀐 상태에서 새로고침해도 같은 화면이 나온다. 두 진입
경로(탭 전환, 직접 진입)가 같은 컴포넌트를 그리니까 어긋날 수가 없다.

## 화면 재사용: HomeScreen 추출

모바일 홈 `(home)/page.tsx`의 본체를 `(home)/_components/HomeScreen.tsx`(서버 컴포넌트,
`team?: Filter` prop)로 뽑고, 홈과 `(home)/teams/[slug]/page.tsx`가 둘 다 이걸 그리게
했다. 팀 허브 라우트를 `(home)` 라우트 그룹 안에 둔 건 의도가 있다. 라우트 그룹은 URL에
안 잡히니까 경로는 `/teams/[slug]` 그대로인데, 파일 위치가 "이건 홈 화면이다"를 말해 준다.
web도 같은 구조로 갔고, 기사 페이지도 나중에 `ArticlesScreen`으로 같은 추출을 했다.

h1이 문제였다. 전략 문서는 팀 정식 명칭을 h1에 쓰라고 하는데 홈 화면에는 h1 자리가 없고,
보이는 h1을 추가하면 UX 불변 약속이 깨진다. `sr-only`로 넣는 타협을 했다. 접근성 명분이
있는 패턴이라 숨김 텍스트 페널티 걱정은 낮다고 판단했다. 완벽하진 않지만 화면을 못 바꾸는
조건에서는 이게 최선이었다.

## 필터의 원본을 URL로 옮기다

여기가 이번 작업의 핵심 판단이다. 원래 필터는 zustand(`homeFilter`)가 원본이었다(KAN-314).
기사에 들어갔다 나오면 홈 트리가 언마운트되어 `useState`가 초기화되니까, 트리 밖에 두자는
결정이었다. 그런데 팀 허브가 생기니 이 구조가 SSR에서 바로 문제가 됐다.

zustand의 `create`는 모듈 스코프에서 돈다. 서버에서도 모듈은 한 번 로드되고, 서버에서는
아무도 `setHomeFilter`를 부르지 않으니 SSR 시점의 스토어는 항상 `ALL`이다. NewsFeed가
스토어에서 필터를 읽는 채로 `/teams/tottenham`을 서버 렌더하면, HTML에는 전체 탭 화면이
찍힌다. 크롤러가 받는 HTML이 틀리는 거다. 팀 허브를 만든 이유가 통째로 무너진다.

그래서 필터를 `usePathname` 파생값으로 바꿨다. `usePathname`은 SSR에서도 실제 요청 경로를
돌려주니까 `/teams/tottenham`을 렌더하면 서버든 클라든 토트넘이 나온다. 탭 클릭은
`history.replaceState`만 부른다. Next가 14.1부터 네이티브 `pushState`/`replaceState`를
라우터 상태와 동기화해 줘서, URL이 바뀌면 `usePathname`이 리렌더를 일으키고 필터가
따라온다. 쿼리키(`articleKeys.feed(team)`)가 필터에 걸려 있으니 데이터 전환은 기존과
완전히 같은 경로로 돈다.

push가 아니라 replace를 고른 이유. 탭 선택을 히스토리에 쌓으면 뒤로가기가 "탭 선택
취소"가 된다. 지금까지 홈에서 뒤로가기는 앱 이탈이었는데 탭을 여섯 번 고르면 여섯 번을
되감아야 나가진다. 필터는 상태지 페이지 이동이 아니라고 보고 replace로 갔다.

KAN-314가 풀던 문제는 그대로 풀린다. 기사에서 뒤로 오면 브라우저가 URL을 되살리고, URL이
곧 필터다. 오히려 스토어보다 견고해졌다. 새로고침해도 팀이 유지된다.

## 스토어의 역할 축소, 그리고 하단 탭

그럼 `homeFilter`는 지워도 되나 싶었는데, 한 군데가 남았다. 하단 탭의 홈 버튼이다. href를
`/`로 고정하면 토트넘 허브를 보다가 릴스에 다녀올 때 전체 탭으로 떨어진다. 종전에는
스토어가 필터를 기억해서 이런 왕복에도 팀이 유지됐는데, 이 감각이 깨지면 그것도 UX 변경이다.

그래서 스토어를 "마지막으로 보던 필터의 기억"으로 역할을 줄여 남겼다. NewsFeed가 URL에서
파생한 필터를 effect로 스토어에 흘려 두고, 하단 탭이 그걸로 홈 href를 만든다
(`teamHubPath(homeFilter)`). 홈 탭을 누르면 `/`가 아니라 `/teams/tottenham`으로 돌아간다.
같은 화면, 이제는 URL까지 일치한다. 당겨서 새로고침(`useHomeRefresh`)도 같은 값을 읽으니
지금 보는 탭만 리셋하는 동작이 유지된다.

씨앗도 일반화가 필요했다. `useArticleFeed`가 서버 씨앗을 `team === "ALL"`일 때만 심게
하드코딩돼 있었는데, 팀 허브는 그 팀의 첫 페이지를 서버에서 받아 내려준다. `initialTeam`
파라미터를 추가해 "씨앗이 어느 탭 것인지"를 넘기고, 그 탭을 보고 있을 때만 심게 했다.

## 중간 피드백: 웹은 절반만 됐다

여기까지 하고 확인을 받았는데 두 가지가 걸렸다.

하나. 모바일은 하단 탭으로 마이페이지에 다녀와도 URL이 유지되는데 웹은 안 됐다. 웹 GNB의
홈 링크를 그대로 둔 탓이다. 모바일 하단 탭에 한 것과 같은 처리를 `NavItem`에 했다. 홈과
기사 링크의 목적지를 스토어에 동기화된 마지막 필터로 조립한다. 활성 판정도
`/teams/*`는 홈, `/articles/teams/*`는 기사로 넓혔다.

둘. 웹 기사 페이지(`/articles`)의 팀 탭에는 URL이 안 붙어 있었다. 처음에는 기사 페이지
필터를 스토어에 남겨 뒀었다. 팀 허브 URL(`/teams/[slug]`)로 바꾸면 새로고침 시 홈 화면으로
건너뛰어 버리니까. 그런데 "기사 페이지에서도 `articles/팀` 식 URL이면 좋겠다"는 피드백을
받고 기사 surface 전용 팀 URL을 만들었다. `/articles/teams/[slug]`다. `/articles/[slug]`는
기존 `/articles/[postId]`와 같은 자리의 동적 세그먼트라 충돌해서 못 쓰고, 정적 세그먼트
`teams`를 끼우면 Next가 정적 우선으로 라우팅해 준다.

이러면 같은 팀 기사 목록이 두 URL에 생긴다. 중복 콘텐츠다. 그래서
`/articles/teams/[slug]`의 canonical은 자기 자신이 아니라 팀 허브 `/teams/[slug]`로
선언했다. 팀 검색어의 랜딩은 팀 허브 하나로 모으고, 기사 쪽 URL은 새로고침·공유가 기사
surface에 남게 하는 UX 몫으로 역할을 나눴다. sitemap에도 팀 허브만 실었다.

결과적으로 웹 PostFeed는 두 surface 모두 URL 파생 필터가 됐고, 스토어 `feedFilters`는
모바일과 같은 "GNB 복귀용 기억"으로만 남았다.

## replaceState는 title을 안 바꾼다

검증 중에 잡은 버그 하나. `/teams/tottenham`을 직접 열면 title이 "토트넘 핫스퍼 이적
루머 | PLick"로 뜨는데, 거기서 전체 탭으로 돌아와도 title이 그대로였다. 당연한 게,
`replaceState`는 서버에 아무것도 요청하지 않으니 Next의 Metadata가 다시 렌더될 일이 없다.
`generateMetadata`는 서버 렌더의 산물이고, 클라에서 URL만 바꾸는 전환에는 관여하지 않는다.

필터 동기화 effect에서 `document.title`을 직접 맞추는 걸로 해결했다. title 문자열이
`generateMetadata`와 클라 양쪽에 생기는 게 찜찜해서, 문자열 조립을 `teamHubTitle`(도메인,
web·mobile 공용)과 `articlesTeamTitle`(웹 전용)로 모아 한 곳만 고치면 되게 했다.

## 도메인에 추가한 것

| 추가                             | 위치                    | 용도                                 |
| -------------------------------- | ----------------------- | ------------------------------------ |
| `Team.slug`                      | domain types·`TEAMS`    | `/teams/[slug]` 경로 조각            |
| `TEAM_BY_SLUG`                   | domain constants (파생) | slug → 코드, 라우트 검증             |
| `TEAM_FULL_NAMES`                | domain constants (파생) | 코드 → 정식 명칭, title·h1           |
| `teamHubPath` 외 경로·title 유틸 | domain format           | 두 앱의 href·replaceState·title 공용 |
| `articlesTeamPath` 등            | web `_utils/feed-paths` | 기사 surface 전용이라 앱에 둠        |

slug는 코드 소문자(`tot`)가 아니라 검색 친화 풀네임(`tottenham`, `manchester-united`)으로
했다. 전략 문서 권장이기도 하고, URL 자체가 검색어 시그널이다. `TEAM_BY_SLUG`와
`TEAM_FULL_NAMES`는 손으로 두 벌 쓰지 않고 기존 테이블에서 파생시켰다. `TEAM_IDS` →
`TEAM_CODES` 때와 같은 원칙이다.

## 검증

- lint, check-types, format:check, web·mobile 클린 빌드 전부 통과.
- 모바일(:3001): 탭 클릭 → 리마운트 없이 URL·피드·title 전환, `/teams/tottenham` 직접
  진입 시 SSR HTML에 토트넘 기사·sr-only h1·canonical(웹 도메인) 포함(curl로 확인), 모르는
  slug 404, sitemap에 팀 6건, 하단 홈 탭 href가 마지막 팀 유지.
- 웹(:3000): 홈 탭 클릭 → `/teams/tottenham`, MY 다녀와서 GNB 홈 → 같은 URL 복귀, 기사
  페이지 탭 클릭 → `/articles/teams/chelsea` + title 전환, 그 URL의 canonical이
  `/teams/chelsea`인 것 curl로 확인.

## 남은 것

- JSON-LD(`CollectionPage`)와 팀별 동적 OG 이미지는 전략 문서 Step 2-3·2-4 몫이다.
- 모르는 slug의 404가 Next 기본 화면이다. 앱 톤의 루트 not-found는 후속으로.
- 릴 개별 URL(`/reels/[postId]`, Step 2-1)은 별도 티켓.
- Search Console 색인 요청과 실배포 검증은 배포 후 운영 작업.
