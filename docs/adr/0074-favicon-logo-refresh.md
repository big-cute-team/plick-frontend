# 0074. 로고 리뉴얼에 따른 파비콘 세트 재생성

## 무엇을 했나

디자인 쪽에서 PLick 로고가 새로 나왔다. 원형 배경은 그대로인데 워드마크 비율이 커지고
글자 형태가 달라졌다. 파비콘은 KAN-346 때 만든 `scripts/favicon/render.mjs`가
`logo.svg` 하나를 원본으로 두 앱의 `icon.png`(512)·`apple-icon.png`(180)·
`favicon.ico`(16+32)를 뽑아내는 구조라, 원본만 갈아끼우고 스크립트를 다시 돌리면 되는
작업이었다.

실제로 한 일은 두 가지다. 새 SVG를 `scripts/favicon/logo.svg`로 교체했고, 스크립트를
돌려 여섯 파일(앱당 셋)을 재생성했다.

## i 점 색 바꿔치기

교체하면서 그냥 복사하면 안 되는 지점이 하나 있었다. 피그마 내보내기는 i 점을 라이트
accent(`#12A968`)로 뽑는데, 앱은 다크 고정이라 파비콘 점은 다크 accent(`#2fd97f`)여야
한다. 이건 KAN-346 때 같은 삽질을 하고 README에 "로고를 다시 내보내면 점 색을
확인한다"라고 적어둔 덕에 이번엔 바로 잡았다. 새 SVG도 역시 `#12A968`로 나와 있어서
`sed`로 치환해 넣었다. 과거의 내가 남긴 메모가 실제로 일한 드문 순간이었다.

## npm install이 모노레포 루트로 새는 문제

README에 적힌 대로 `cd scripts/favicon && npm install @resvg/resvg-js`를 했더니
eresolve 에러로 깨졌다. 원인은 npm의 동작 방식이다. npm은 현재 폴더에 package.json이
없으면 가장 가까운 package.json을 찾아 위로 올라가는데, `scripts/favicon`엔
package.json이 없으니 모노레포 루트까지 올라가 pnpm 워크스페이스용 package.json을
집어 들었다. 루트 의존성 트리는 pnpm 기준이라 npm이 해석하다 충돌이 난 것이다.

`npm install --prefix . --no-save --no-package-lock @resvg/resvg-js`로 설치 위치를
현재 폴더에 고정해 해결했다. KAN-346 때는 어쩌다 통과했는지 모르겠지만(루트 의존성이
그 사이 늘었을 것이다), 재현되는 문제라 README의 설치 명령도 이걸로 고쳐 뒀다.

## 건드리지 않은 것

정적 OG 이미지(`opengraph-image.png`)는 파비콘과 원본이 다르다. 그쪽은
`scripts/og-image/render.mjs`가 `@plick/ui` Logo 컴포넌트의 워드마크 벡터를 인라인으로
품고 있다. 이번 리뉴얼이 워드마크 자체를 바꾼 것이라면 Logo 컴포넌트와 OG 스크립트도
새 벡터로 따라가야 하는데, 그건 파비콘 재생성과는 별개 작업이라 이 세션에선 손대지
않았다. 필요해지면 후속으로 한다.

## 검증

재생성된 `icon.png`와 `apple-icon.png`를 열어 새 워드마크와 초록 점(`#2fd97f`)을 눈으로
확인했다. `favicon.ico`는 `file` 명령으로 32·16 두 엔트리 32bpp가 제대로 조립됐는지
확인했다. 파이프라인 배경은 [ADR 0070](0070-seo-step0-site-url-og.md)에 있다.
