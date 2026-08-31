# 성능 감사 — 2026-08-31

## 요약

범위: `apps/mobile` + `apps/web` + `packages/*` 전체. 이미지·폰트·미디어 / 데이터 페칭·워터폴 /
번들·클라이언트 렌더링 세 축으로 전수 검사했다. 목적은 포트폴리오용 "수치 X → Y" 개선 후보 발굴.

기초 체력은 좋다. passive 리스너, zustand 셀렉터, 서버 씨앗 + `initialDataUpdatedAt`,
인증/익명 분기 캐싱(`packages/core/src/client.ts`), 배럴 금지, GA afterInteractive,
transform 기반 애니메이션, OAuth 서버사이드(클라 SDK 0)까지 지켜져 있다.
개선 여지는 6개 덩어리에 몰려 있다: LCP(폰트·첫 슬라이드), 전 라우트 동적 렌더,
서버 워터폴·중복 페치, 코드 스플리팅 부재, 시트 드래그 리렌더, 릴스 DOM 누적.

### 현재 기준선 (2026-08-31 로컬 prod 빌드 실측)

- 공유 First Load JS: gzip 128KB (raw 445KB, rootMainFiles 4개)
- 전체 클라이언트 청크: gzip 353KB (raw 1.1MB)
- 라우트 22개 전부 동적(ƒ). 정적(○)은 아이콘·robots·manifest 등 파일 라우트뿐
- Lighthouse·DevTools 실측은 아직 없음 — 개선 착수 전 반드시 캡처(아래 측정 계획)

---

## 🔴 1. LCP — 릴스 첫 슬라이드 lazy + 렌더 블로킹 외부 폰트 CSS

| #   | 항목                                                  | 위치                                                                                                      | 근거                                                                                                                              | 권장 조치                                                                                                                       |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 릴스 첫 슬라이드(=LCP 요소)가 `loading="lazy"`        | `apps/mobile/app/reels/_components/ReelItem.tsx:133`, `apps/web/app/reels/_components/ReelItem.tsx:95`    | 뷰포트 안 lazy 이미지는 레이아웃 후 낮은 우선순위로 큐잉돼 LCP가 밀림. `fetchPriority`는 리포 전체 0건                            | index 0(모바일 `active`, 웹 `data-reel-index`)에만 `loading="eager" fetchPriority="high"`                                       |
| 2   | Pretendard 통짜 variable CSS를 jsdelivr에서 동기 link | `apps/mobile/app/layout.tsx:109-112`, `apps/web/app/layout.tsx:88-91`                                     | 렌더 블로킹 외부 CSS + preconnect 0건 + dynamic-subset 아님(한글 전 글리프, MB 단위) + CSS→woff2 2단 폭포수. `next/font` 사용 0건 | `next/font/local`로 셀프 호스팅 — preload·`font-display: swap` 자동, 기존 CloudFront `/_next/static` immutable 캐시를 그대로 탐 |
| 3   | 트윗 이미지 오리진 preconnect 없음                    | 같은 layout                                                                                               | 릴 전건이 현재 `imageUrl` null이라 실질 미디어 경로가 `react-tweet` 임베드 → `pbs.twimg.com` 직결                                 | `<link rel="preconnect" href="https://pbs.twimg.com">` 추가                                                                     |
| 4   | 홈 캐러셀 히어로 5장 전부 eager 동순위                | `apps/mobile/app/(home)/_components/HotHeroCard.tsx:32`, `apps/web/app/(home)/_components/HotCard.tsx:54` | eager 자체는 의도(복제 카드 빈칸 방지, 주석 있음)지만 5장이 대역폭 경합                                                           | 가운데 1장 `fetchPriority="high"`, 나머지 `low`                                                                                 |

## 🔴 2. TTFB·정적화 — 루트 레이아웃이 전 라우트를 막는다

| #   | 항목                                            | 위치                                                                | 근거                                                                                                                                                                          | 권장 조치                                                                                                       |
| --- | ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 5   | `getMyProfile()`이 전 페이지 첫 바이트를 블로킹 | `apps/mobile/app/layout.tsx:89-90`, `apps/web/app/layout.tsx:82-83` | 레이아웃은 스트리밍 경계 밖. 로그인 유저는 `/faq` 같은 무데이터 페이지도 BE 왕복(no-store) 후에야 HTML 시작                                                                   | ① Suspense로 프로필 시딩만 스트리밍 ② userId·닉네임을 JWT 클레임 디코드로(왕복 0회) ③ 클라 쿼리로 이관 — 중 택1 |
| 6   | 루트 `cookies()`가 전 라우트를 동적 렌더로 고정 | 같은 위치 (`isLoggedIn()`)                                          | 빌드 출력 22 라우트 전부 ƒ. `/faq`·`/terms`·`/privacy`·`/signup`은 완전 정적 가능, 홈·기사 목록은 ISR 60s 가능(익명 GET은 이미 Data Cache 60s를 타지만 페이지 렌더는 매 요청) | #5 해결과 세트. 이후 정적/ISR 전환                                                                              |
| 7   | `teams/[slug]` `generateStaticParams` 부재      | `apps/*/app/(home)/teams/[slug]/page.tsx`                           | 팀 6개 고정(`TEAM_ORDER`)이라 빌드 타임 전량 생성이 자명                                                                                                                      | `generateStaticParams` 추가 (#6 선행 필요)                                                                      |

## 🔴 3. 서버 워터폴·중복 페치

| #   | 항목                                               | 위치                                                                                            | 근거                                                                                                                     | 권장 조치                                                                 |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 8   | 기사 상세 `getRelatedArticles` 직렬 1 RTT          | `apps/mobile/app/articles/[postId]/page.tsx:140`, `apps/web/app/articles/[postId]/page.tsx:159` | 실제 의존은 `getArticle` 하나인데 `allSettled` 전체(최장=댓글)를 기다린 뒤 시작                                          | `articleP.then(a => getRelatedArticles(...))`로 체이닝해 병렬 묶음에 합류 |
| 9   | 릴스 딥링크 같은 릴 2회 페치                       | `apps/*/app/reels/[postId]/page.tsx:29` vs `:79-81`(web `:83-85`)                               | metadata가 `size=1`, 페이지가 `size=10` → URL이 달라 fetch 메모이제이션 불성립. 익명도 BE 2회                            | metadata도 기본 size로 호출해 1회로 병합                                  |
| 10  | sitemap `force-dynamic` + 순차 커서 최대 1,500회   | `apps/*/app/sitemap.ts:15,67-84`                                                                | 크롤러 호출마다 30건씩 순차 재수집, 캐시 없음                                                                            | `revalidate: 3600`으로 전환                                               |
| 11  | `getMyProfile`·`getBlockedUsers` 중복제거가 암묵적 | `apps/*/app/_services/profile.ts:64-67`, `apps/mobile/app/_services/blocks.ts:31-34`            | 레이아웃+페이지가 같은 요청에서 각각 호출(`/me`, `/me/edit`, `/login`, 온보딩). fetch 메모이제이션에 의존 중, 검증 안 됨 | `React.cache()` 래핑으로 명시화                                           |

## 🟡 4. 번들 — 코드 스플리팅 전무

| #   | 항목                                             | 위치                                     | 근거                                                                                                                                                          | 권장 조치                                                                                                     |
| --- | ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 12  | `next/dynamic`·`React.lazy`·`Suspense` 0건       | 모노레포 전역                            | 조건부 UI가 전부 초기 번들. `ReelDetailSheet`(CommentThread 525줄 + VoteCard 238줄 + 뮤테이션 훅 다수)가 릴스 첫 페인트 전 다운로드·파싱 (`ReelsFeed.tsx:16`) | `ReelDetailSheet`·`ShareDialog`·`LoginPromptDialog`·`ReportCommentDialog`·`ReelDetailPanel`(web) dynamic 전환 |
| 13  | react-tweet(+swr)이 무조건 초기 번들             | `apps/*/app/_components/TweetEmbed.tsx`  | 사진 있는 릴에는 불필요 (`ReelItem.tsx:128` 분기)                                                                                                             | `TweetEmbed` dynamic 전환                                                                                     |
| 14  | `_constants/app.ts`가 아이콘 5개를 그래프로 견인 | `apps/mobile/app/_constants/app.ts:4-10` | 숫자 상수(`RESTORE_MAX_FRAMES` 등)만 쓰는 모듈이 `TABS`의 아이콘 참조까지 끌고 옴                                                                             | `TABS`를 `_constants/tabs.ts`로 분리                                                                          |
| 15  | `icons.tsx` 사실상 배럴(34개, 47곳 사용)         | `packages/ui/src/icons.tsx`              | Turbopack 트리셰이킹이 동작할 가능성 높으나 미검증                                                                                                            | 실제 청크 열어 검증 후 판단. 우선순위 낮음                                                                    |

## 🟡 5. 인터랙션 — 시트 드래그 프레임당 전체 리렌더 · 릴스 DOM 누적

| #   | 항목                                                    | 위치                                                                                                             | 근거                                                                                                                                      | 권장 조치                                                                                                                                   |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | 시트 드래그 `dragY`가 React state, 소유자가 `ReelsFeed` | `apps/mobile/app/_hooks/useReelDetailMotion.ts:20,55-57,117-119`                                                 | 매 프레임 `ReelsFeed` 리렌더 → memo 0건 + 인라인 props(`ReelsFeed.tsx:168,172-181`)라 DOM의 릴 전량 재조정                                | 리포 내 정답 패턴 이식: `useTeamSwipePager.ts:44,292`처럼 ref에 `style.transform` 직접 쓰기. `dragYRef`가 이미 있어 변경 범위 좁음          |
| 17  | 릴스 DOM 무제한 누적 + 화면 밖 트윗 페치                | `apps/mobile/app/reels/_components/ReelsFeed.tsx:163-183`, `apps/web/app/reels/_components/ReelViewer.tsx:36-45` | 무한쿼리 페이지 전량이 DOM 유지(gcTime 30분). 릴당 ResizeObserver 2개, 사진 없는 릴은 마운트 즉시 `/api/tweet/{id}` 페치 — 화면 밖 40장도 | `activeIndex ± 2` 밖은 내용 언마운트, 빈 `<section>` 골격만 유지(Embla가 슬라이드 수를 재는 구조라 개수는 보존). TanStack `maxPages`도 검토 |
| 18  | `will-change` 0건                                       | 전역                                                                                                             | 컴포지터 승격 힌트 없음. 단 상시 부착 금지 — `ScrollArea.tsx:40-48`에 조상 transform이 sticky를 깨는 실측 기록 있음                       | 제스처 생명주기(`dragging` 등)에 묶어 조건부로만                                                                                            |

## 🔵 6. 저비용 정리

| #   | 항목                                                                                 | 위치                                                                              | 권장 조치                                                 |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 19  | `public/`이 CDN 밖 — 팀 로고 6장(154KB)·favicon류가 매 요청 EC2 + `max-age=0` 재검증 | `docs/deploy-v3-cdn.md:546`에 후속 과제로 이미 등재                               | `public/` CloudFront 비헤이비어 추가                      |
| 20  | 미참조 자산                                                                          | `apps/mobile/app/fonts/Geist*.woff`(134KB), `apps/mobile/public/` SVG 7개(14.6KB) | 삭제. `che.webp` 45.8KB는 렌더 18~51px라 리사이즈         |
| 21  | `<img>` `decoding="async"` 0건                                                       | 이미지 렌더 7곳 전부                                                              | 일괄 추가                                                 |
| 22  | `useDebates` `initialDataUpdatedAt` 시계 클램프 누락                                 | `apps/*/app/_hooks/useDebates.ts:28`                                              | 다른 훅처럼 `Math.min(fetchedAt, Date.now())`             |
| 23  | 익명 GET revalidate 60s 일률                                                         | `packages/core/src/client.ts`                                                     | 기사 상세(불변)는 300~3600s로 상향 여지                   |
| 24  | 홈·릴스·토론·me에 `loading.tsx` 없음                                                 | 각 라우트                                                                         | 체감 로딩 개선. `articles/[postId]`·`me/edit`엔 이미 있음 |

## 문제 없음으로 확정한 항목

- CLS: 이미지 전부 크기 확정 컨테이너 (`absolute inset-0` / 인라인 style)
- `use client` 배치: page.tsx 0건, children-as-props 서버 경계 정석
- 의존성: 차트·애니메이션·date·lodash류 0. 날짜는 `@plick/domain/format` 자체 구현
- zustand: 셀렉터 없는 전체 구독 0건, 프레임당 값은 `getState()` 패턴
- passive 리스너: `preventDefault` 필요한 `touchmove`만 `passive: false`
- transform vs top/left: 전부 transform. rAF 사용처 적절
- 미들웨어(proxy.ts): 정상 경로 쿠키 검사만, refresh는 만료 시 1회 + 동시요청 병합(KAN-379)
- fetch 캐싱 안전성: 인증 호출이 공유 캐시에 새는 경로 0. 배럴 0건. GA afterInteractive
- 서버 씨앗: 홈·기사·릴스·댓글 전부 `initialData` + `fetchedAt` 클램프(토론 제외, #22)

---

## 측정 계획 (개선 착수 전 캡처 필수)

개선 전후 비교가 포트폴리오의 핵심이므로, 코드를 건드리기 전에 아래를 먼저 떠 둔다.
로컬 dev가 아니라 prod 빌드(`pnpm build` + `next start`) 또는 dev 배포 환경에서 잰다.

| 항목                        | 도구                                  | 대상                                    |
| --------------------------- | ------------------------------------- | --------------------------------------- |
| LCP·FCP·TBT·Lighthouse 점수 | Lighthouse (모바일 에뮬, 3회 중앙값)  | `/`(홈), `/reels`, `/articles/[postId]` |
| 폰트 전송량·요청 폭포수     | DevTools Network (Disable cache)      | 첫 로드                                 |
| TTFB (로그인/비로그인 각각) | DevTools Network 또는 `curl -w`       | `/faq`, `/`, `/reels`                   |
| 라우트별 First Load JS      | `next build` 출력 + 청크 gzip 합산    | `/reels` 중심                           |
| 드래그 프레임 시간·리렌더   | DevTools Performance + React Profiler | 릴 30장+ 누적 후 시트 드래그            |
| DOM 노드 수·힙·트윗 요청 수 | DevTools Memory·Network               | 릴 50장 스크롤 후                       |
| 서버 왕복 수                | BE 로그 또는 프록시 카운트            | 기사 상세, 릴스 딥링크, sitemap         |

## 포트폴리오 서사 추천 조합

1. LCP 개선기: #1~#4 (폰트 셀프호스팅 + subset + fetchPriority) — 점수·LCP·전송량이 한 번에 움직여 가장 극적
2. 전 라우트 동적 → 정적/ISR 전환기: #5~#7 — "cookies() 한 줄이 22개 라우트를 동적으로 만들었다"는 발견 서사 + TTFB·빌드 출력 변화로 증명
3. 릴스 인터랙션 최적화기: #16~#17 — 프레임당 리렌더 제거("N회/프레임 → 0회")와 DOM 윈도우잉. 제스처 UI 성능이라 차별화
