# favicon

파비콘 세트 생성 도구다. 산출물은 두 앱 `app/`의 `icon.png`(512)·`apple-icon.png`(180)·
`favicon.ico`(16+32)로 커밋되어 있어 평소에는 돌릴 일이 없다. 로고가 바뀔 때만 다시 돌린다.

원본은 `logo.svg`(피그마에서 내보낸 520x520 다크 원형 로고)다. i 점은 다크 테마 accent
`#2fd97f`로 맞춰 두었다(피그마 내보내기 기본값이 라이트 accent `#12A968`라 바꿔치기했다).
로고를 다시 내보내면 점 색을 확인한다.

```bash
cd scripts/favicon
npm install --prefix . --no-save --no-package-lock @resvg/resvg-js
node render.mjs
```

`--prefix .` 없이 설치하면 npm이 모노레포 루트 package.json까지 올라가 eresolve로 깨진다.

icon.png는 원형 그대로(모서리 투명), apple-icon.png는 iOS가 투명 배경을 검게 칠해 버려서
다크 토큰 배경을 정사각으로 깔았다. favicon.ico는 스크립트가 BMP 엔트리를 직접 조립한다.

배경과 판단 기록은 [ADR 0070](../../docs/adr/0070-seo-step0-site-url-og.md)에 있다.
