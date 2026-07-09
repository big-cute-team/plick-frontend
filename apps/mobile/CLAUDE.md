# apps/mobile

PLick **모바일 웹뷰** 앱 (dev :3001). 갤럭시/아이폰/폴드 등 다기기에서 안 깨지는 게 목표.

- 화면·컴포넌트를 만들거나 고칠 땐 **`screen-publishing` 스킬**과 [ADR 0002](../../docs/adr/0002-mobile-home-layout.md)를 따른다.
- 뼈대: `AppShell` + `ScrollArea` (+ `TopBar`/`TabBar`). 사진 자리는 `MediaThumb`, 팀 표식은 `TeamCrest`.
- 목데이터·타입은 `app/_lib/`, 컴포넌트는 `app/_components/` (라우트 아닌 private 폴더 `_`).
- 색·간격은 토큰 유틸만, 좌우 패딩은 `px-edge`, 다크 기준으로 작성(라이트 자동).
