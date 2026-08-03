# og-image

OG 기본 이미지(1200x630) 생성 도구다. 산출물은 `apps/{mobile,web}/app/opengraph-image.png`로
커밋되어 있어 평소에는 돌릴 일이 없다. 문구나 브랜드 색이 바뀔 때만 다시 돌린다.

렌더는 `@resvg/resvg-js`로 하고, 태그라인 폰트는 앱이 CDN으로 쓰는 Pretendard의
정적 SemiBold를 받아 쓴다. 폰트 파일은 용량 때문에 커밋하지 않는다.

```bash
cd scripts/og-image
curl -sL -o Pretendard-SemiBold.otf "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/packages/pretendard/dist/public/static/Pretendard-SemiBold.otf"
npm install @resvg/resvg-js
node render.mjs
cp opengraph-image.png ../../apps/mobile/app/opengraph-image.png
cp opengraph-image.png ../../apps/web/app/opengraph-image.png
```

색 값은 `packages/tokens/theme.css`의 다크 토큰(bg, text, text-3, accent)을 그대로 옮긴 상수다.
토큰이 바뀌면 `render.mjs` 상단 상수도 맞춘다. 워드마크 벡터는 `@plick/ui` `Logo.tsx` 원본이다.

배경과 판단 기록은 [ADR 0070](../../docs/adr/0070-seo-step0-site-url-og.md)에 있다.
