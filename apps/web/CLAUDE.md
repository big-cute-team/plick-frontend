# apps/web

@../CLAUDE.md

PLick 데스크톱 웹 (dev :3000). 모바일과 같은 토큰을 쓰고 컨테이너 패턴으로 폭을 제한한다.

- 화면·컴포넌트를 만들거나 고칠 땐 `web-publishing` 스킬을 따른다(`@plick/ui` 승격 절차 포함).
  배경은 [ADR 0005](../../docs/adr/0005-web-home-and-ui-promotion.md).
- 재사용 조사가 먼저다. `packages/ui/src` → `apps/mobile/app/_components` 순으로 기존 구현을 찾고,
  모바일에 있고 앱 중립적이면 `@plick/ui`로 승격한다.
- 데스크톱 1280 기준으로 만들되 가로 330px까지 무너지지 않아야 한다. 요소를 모바일에서 숨길지는 사용자에게 묻는다.
- hover와 focus-visible 상태를 포함한다.
