# og-image

OG 기본 이미지(1200x630) 생성 도구다. 산출물은 `apps/{mobile,web}/app/opengraph-image.png`로
커밋되어 있어 평소에는 돌릴 일이 없다. 문구나 브랜드 색이 바뀔 때만 다시 돌린다.

렌더는 `@resvg/resvg-js`로 하고, 글자는 `apps/web/assets/og`의 Noto Sans KR Black·Bold(동적 OG와
같은 파일, `scripts/fonts`로 생성)로 그린다. 스크립트가 두 앱 `app/opengraph-image.png`까지 직접 쓴다.

```bash
cd scripts/og-image
npm install @resvg/resvg-js
node render.mjs
```

색 값은 `packages/tokens/theme.css`의 라이트 토큰(bg, accent, text-3)을 그대로 옮긴 상수다.
토큰이 바뀌면 `render.mjs` 상단 상수도 맞춘다. 워드마크는 `@plick/ui` `Logo.tsx`와 같은 글자 로고다(KAN-567).

## team-logos.mjs

동적 OG(KAN-351)용 팀 로고 PNG 변환 도구다. satori(next/og)가 webp를 못 읽어서
`apps/web/public/teams/*.webp`를 512x512 투명 캔버스 contain PNG로 바꿔
`apps/web/assets/og/teams/`에 커밋한다. 로고 원본이 바뀔 때만 다시 돌린다.

```bash
cd scripts/og-image
npm install sharp
node team-logos.mjs
```

배경과 판단 기록은 [ADR 0070](../../docs/adr/0070-seo-step0-site-url-og.md)에 있다.
