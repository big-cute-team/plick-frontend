# apps/mobile

@../CLAUDE.md

해축이모(구 PLick) 모바일 웹뷰 앱 (dev :3001). 갤럭시/아이폰/폴드 등 다기기에서 안 깨지는 게 목표.

- 화면·컴포넌트를 만들거나 고칠 땐 `screen-publishing` 스킬과 [ADR 0002](../../docs/adr/0002-mobile-home-layout.md)를 따른다.
- 뼈대: `AppShell` + `ScrollArea` (+ `TopBar`/`SubTopBar`/`TabBar`). 확인 행동은 `BottomSheet`다. 팀 표식은
  `TeamCrest`(빅6)·`LiveCrest`(그 외 회색 원). `Logo`·`icons`·`VoteCard`·`VsMark`·`NewBadge`는 웹과 공용이라 `@plick/ui`에 있다.
- 목데이터는 `app/_mocks/posts.ts`, 도메인 타입·상수·포맷은 `@plick/domain`(ADR 0018).
  컴포넌트는 화면 전용 → 해당 라우트의 `_components/`(예: `app/(home)/_components`, `app/reels/_components`),
  2개 화면 이상 공용 → `app/_components/`. 훅·서비스·유틸·타입·상수는 `app/` 레이어 폴더(`apps/CLAUDE.md`).
- 색·간격은 토큰 유틸만, 좌우 패딩은 `px-edge`(16), 라이트 기준으로 작성.
