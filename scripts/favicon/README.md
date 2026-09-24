# favicon

파비콘 세트 생성 도구다. 산출물은 두 앱 `app/`의 `icon.png`(512)·`apple-icon.png`(180)·
`favicon.ico`(16+32)로 커밋되어 있어 평소에는 돌릴 일이 없다. 로고가 바뀔 때만 다시 돌린다.

원본은 `logo.svg`(520x520, 강조색 `#0a6b42` 둥근 사각 위 흰 "해" 글자)다. 글자는
`apps/web/assets/og/NotoSansKR-Black.ttf`로 렌더하므로 그 파일이 있어야 한다(KAN-567).

```bash
cd scripts/favicon
npm install --prefix . --no-save --no-package-lock @resvg/resvg-js
node render.mjs
```

`--prefix .` 없이 설치하면 npm이 모노레포 루트 package.json까지 올라가 eresolve로 깨진다.

icon.png는 둥근 사각 그대로(모서리 투명), apple-icon.png는 iOS가 투명 배경을 검게 칠해 버려서
강조색 배경을 정사각으로 깔았다. favicon.ico는 스크립트가 BMP 엔트리를 직접 조립한다.

배경과 판단 기록은 [ADR 0070](../../docs/adr/0070-seo-step0-site-url-og.md)에 있다.
