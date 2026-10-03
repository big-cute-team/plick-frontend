# brand-assets

해축이모 로고 산출물 생성 도구다(KAN-583). 산출물은 두 앱에 커밋되어 있어 평소에는 돌릴 일이 없다.
로고 원본이 바뀔 때만 다시 돌린다.

피그마 Plick 파일 "해축이모 리디자인" 섹션의 `로고` 프레임(1126:2)이 출처다. 로고가 벡터가 아니라
래스터 이미지 채움이라 SVG로 못 뽑고, MCP `download_assets`의 rawImages(원본 채움 PNG)를 `src/`에 둔다.

- `src/logo-horizontal.png`: `Logo/가로형`(1180:802)의 투명 원본, 흰 외곽선 있는 판
- `src/app-icon.png`: `Logo/앱 아이콘 · 캐릭터형`(1180:800)의 정사각 원본(모서리 없음)

```bash
cd scripts/brand-assets
npm install
node build.mjs
```

산출물과 쓰임은 `build.mjs` 머리말에 있다. 화면 쪽 높이 규칙(앱 상단 바 32, 웹 GNB 40,
로그인 51·67)은 `@plick/ui` `Logo.tsx`가 받는다. OG 이미지는 `scripts/og-image`가
`apps/web/assets/og/logo-horizontal.png` 사본을 쓴다.
