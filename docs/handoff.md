# CLAUDE.md — PLick 프로젝트 컨텍스트 / 핸드오프

이 문서는 PLick MVP의 제품·기술 결정과 하드원(hard-won) 교훈을 새 작업자(AI/사람)에게 전달하기 위한 것이다. 코드 작성 전 반드시 훑을 것.

## 1. 제품 개요

- **PLick**: 프리미어리그 **이적 루머**를 릴스형(숏폼) 피드로 빠르게 넘겨보는 앱.
- 콘텐츠: **빅6**(맨유·맨시티·리버풀·첼시·아스날·토트넘) 중심. 해외 기자발 소식을 **신뢰도(티어)** 와 함께.
- 핵심 UX: 세로 스와이프로 루머 이동, **왼쪽 스와이프로 상세/팬반응** 진입.
- **앱(모바일) 우선**. 모바일은 Next 웹앱으로 만들고 추후 네이티브 셸(Capacitor 권장)로 래핑.

## 2. 핵심 UX 결정 (가장 중요)

- **캐러셀 = Embla 채택** (Motion/Swiper/CSS Scroll Snap 비교 후).
  - PoC 벤치마크 결과: Motion이 좋아 보였으나 그 우위는 **windowing(가상화) 때문**이었고, 공정 비교(windowing 제거) 시 Embla와 동급/우위. Embla가 경량·제어력·릴스 감각 균형 1위.
  - CSS Scroll Snap: 릴스 감각 부족 + 휠 이동 신뢰성 낮아 제외.
- **우측 패널 = "투패널(좌우 캐러셀)"**, 오버레이 아님.
  - 오버레이(Motion drawer)는 가로 열기/닫기에서 제스처가 자주 씹힘(이산 임계 판정 + dragDirectionLock + 마운트 레이스). 투패널은 라이브러리가 포인터를 연속 소유·가역 스냅해 구조적으로 매끄러움.
- 구조: **바깥 가로 Embla `[피드 | 패널]` + 안쪽 세로 Embla(피드)**.

## 3. 기술 스택 & 모노레포

- **pnpm workspaces + Turborepo** (create-turbo로 부트스트랩). 이유: 디스크 효율, 엄격한 의존성 격리, 버전 통일(catalog), Next 궁합.
- **Next.js(App Router) + TypeScript + Tailwind CSS v4**.
- 스코프 **`@plick/*`**.
- 폰트: Pretendard Variable(CDN link).

## 4. 저장소 구조 (모노레포)

```
apps/
  web/       Next — 웹(데스크톱)
  mobile/    Next — 모바일 웹 (추후 네이티브 셸)
packages/
  tokens/    @plick/tokens — 디자인 토큰(@theme CSS)
  core/      @plick/core   — 타입·team-brand·rumor-stage·gesture·API
  ui/        @plick/ui     — 공용 컴포넌트(TeamCrest, FeedCard, PanelContent, icons …)
  *-config/  eslint / tsconfig 공유
```

- 원칙: **재사용 UI·토큰·로직 = packages / 라우트·화면조립·반응형 = apps**.
- 앱은 `"@plick/x": "workspace:*"`로 의존. next.config에 `transpilePackages: ["@plick/ui","@plick/core","@plick/tokens"]`.

## 5. 실행

```
pnpm install
pnpm dev                 # web + mobile 동시
pnpm --filter mobile dev # 개별
```

Tailwind v4: 각 앱 `app/globals.css` 최상단 `@import "tailwindcss";` + `@import "@plick/tokens/theme.css";`, `postcss.config.mjs`에 `@tailwindcss/postcss`.

## 6. 디자인 시스템 (단일 소스 = @plick/tokens/theme.css)

- **테마 t27 확정**: 네이비 베이스 + 레드 accent (테마 후보 26종 실험 후 단일 확정).
- **색 토큰(`--plk-*`)**: surfaces(`--plk-bg #0f1a2e`, `--plk-surface #17243f`, `--plk-nav-bg #0c1626`), text(4단계 + muted/mono), accent(`#e0263a`/strong/on-accent), semantic(positive `#2dd4c4`/negative/like/link), stage(rumour 골드/progress 블루/official 틸).
- **타입 스케일**(@theme): `text-micro 10 / caption 11 / label 12 / body 13 / body-lg 14 / title 20 / headline 23`.
- **행간/자간**: `leading-headline 1.22 / body 1.5 / reading 1.62`, `tracking-heading -0.5px / caps 0.5px`.
- **radius**: `rounded-chip 4 / tag 6 / control 8 / panel 10 / card 12` (+full).
- **팀 컬러**(`@plick/core`의 team-brand): 코드 생성 크레스트용 `{primary, deep, ink}`. 빅6 공식 hex — MUN `#fe0000`, MCI `#6caddf`(밝아서 ink 어둡게 `#0b1722`), CHE `#001489`, TOT `#011e5a`, LIV `#fb0009`, ARS `#ef0107`.
- 규칙: 임의 px(`text-[13px]`) 금지 → 스케일 유틸만. 팀색은 `getTeamBrand(short)`로만 접근(hex 직접 X).

## 7. 화면 & IA

```
회원가입/로그인 → (최초)온보딩(소개·사용법·마이팀 선택) → 메인
메인 = 하단탭 [릴스 | 마이페이지]
  릴스: 세로=루머 이동, 좌스와이프=상세/팬반응(투표·댓글)
  마이페이지: 프로필 + 마이팀 피드 / 저장됨(그리드)
```

## 8. 컴포넌트 인벤토리 (공개 기준)

- 셸/네비: `EmblaApp`(상태머신), `AppTabBar`(릴스·마이페이지)
- 스크린: `AuthScreen`, `OnboardingScreen`, `MyPageScreen`, `EmblaFeed`(릴스+디테일 컨테이너)
- 피처: `FeedCard`, `PanelContent`(디테일), `FeedTopBar`(상단 크롬, `showMeta` prop), `PostThumb`(그리드), `EdgeGlow`
- 공용: `TeamCrest`(전 화면 재사용 — 팀 컬러+약자 방패 SVG), icons
- 릴스 카드 규칙: **팬반응/원문 버튼 없음**. 투표/토론 글(`contentType` DEBATE/FINISH)에만 "투표·토론 참여" CTA. 원문은 디테일에만.

## 9. 라우팅 / 페이지 구조 (마이그레이션 목표)

- 현재 PoC는 `/embla` 단일 URL + 상태머신 → **실제 라우트로 분리 필요**(공유 딥링크 때문).
- 목표: `/login` `/signup` `/onboarding` `/reels` **`/reels/[postId]`**(공유 타깃) `/reels/[postId]?panel=detail` `/me`.
- 공유 = 해당 릴스로 직행 → 게시물 고유 URL + OG 메타(썸네일) + 딥링크(비로그인 시 `?returnTo`).
- 가드: 토큰 + `onboardingCompleted`로 리다이렉트.

## 10. 데이터 모델 & 화면별 요구 (BE 인풋)

- 핵심 타입: `FeedPost{ id,title,summaryShort,summaryDetail,teams[],players[],reporter{name,tier},rumorStage(RUMOR|IN_PROGRESS|OFFICIAL),contentType(GENERAL|DEBATE|FINISH),originalUrl,publishedAt,likeCount,commentCount,comments[],debate? }`, `Comment{...,replies[]}`, `Debate{topic,optionA/B,votesA/B,closesLabel,myVote}`, `User{nickname,myTeam}`.
- **개인화 플래그 필수**: 목록 응답에 `liked/saved/myVote` 포함(버튼 활성 상태 표시).
- 상대시간은 서버 ISO → FE 포맷. 이미지는 코드 크레스트라 URL 불필요.
- 각 화면 **loading / empty / error** 상태 정의 필요(스켈레톤·빈문구·재시도).
- 피드 딥링크용 **anchor(postId 기준 전후 페이지)** API 필요.

## 11. 기술적 교훈 / 반드시 알아야 할 함정 (gotchas)

1. **Android touch-action**: iOS는 `preventDefault`로 제스처 제어되지만 **Android Chrome은 `touch-action` 명시 필수**. 피드 뷰포트 `touch-action: none`(세로 Embla + 커스텀 가로 스와이프 모두 JS), 패널/댓글 스크롤 `touch-action: pan-y`(세로 네이티브 스크롤 + 가로 닫기 스와이프). 안 하면 갤럭시에서 스와이프가 씹힘.
2. **Embla sub-pixel seam**: DPR 분수(예 2.625) 기기에서 중첩 % 레이아웃 반올림으로 pane이 뷰포트보다 좁게 측정돼 좌/우 가장자리에 옆 pane이 1~2px 비침. 해결 조합:
   - pane 폭을 **실측 px로 고정**(ResizeObserver로 root 폭 측정 → 설정 → `reInit`),
   - 피드 pane **우측 +2px 오버필**(릴스 우측 비침 방지),
   - 패널 좌측 **커버 스트립(surface)** 은 **패널 열림(index 1)일 때만 렌더**(안 그러면 릴스 우측으로 삐져나와 네이비 선 생김 — 실제로 겪음).
   - 픽셀 단위로 검증할 것(sharp 등). elementFromPoint는 `pointer-events-none` 오버레이를 건너뛰어 오해 유발.
3. **오버스크롤 바운스**: Embla엔 over-scroll 끄는 옵션 없음. 세로는 **`loop:true`** 로 끝 바운스 제거(무한 릴스), 가로는 **`watchDrag:false` + 커스텀 스와이프→`scrollTo`** 로 바운스 없이 방향만.
4. **backdrop-filter blur 비용**: 액션 버튼/탭바의 `blur()`가 스크롤 중 매 프레임 리컴포짓 → 빠른 스크롤일수록 프레임 드랍("툭툭"). 성능 개선 1순위 후보.
5. **스냅 임계점**: Embla 기본 `dragFree:false` = 드래그가 임계 미달이면 원글로 스냅백 → 쇼츠보다 덜 매끄러움. 관성 없음. 튜닝 여지.
6. **무거운 카드 + windowing 없음**: 카드당 그라데이션·SVG 다수 + 전 게시물 DOM 상주. 대량 시 windowing 필요(선택 구현에 이식 가능한 직교 최적화).

## 12. 컨벤션

- 파일 kebab-case / 컴포넌트 PascalCase / 훅 useXxx / 상수 UPPER_SNAKE.
- 색은 `var(--plk-*)`, 크기·형태는 토큰 유틸(`text-body`,`rounded-card`).
- 기본 서버 컴포넌트, 상호작용 시 `"use client"`.
- import alias `@/*`.

---

_이 문서는 살아있는 핸드오프 문서다. 결정이 바뀌면 갱신할 것._
