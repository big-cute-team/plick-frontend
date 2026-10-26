# 0214. 리브랜딩 SEO 잔여 정리: 옛 이름 잇기, manifest 단일 출처, 팀 OG 겹침 (KAN-633)

## 출발점

KAN-567에서 서비스 이름이 "플릭 PLick"에서 "해축이모"로 바뀌었다. 도메인(plick.co.kr, m.plick.co.kr)은 그대로다.
title, description, og:site_name, JSON-LD, OG 이미지, 아이콘은 그때 다 바꿨고 10-11에 prod 응답으로도 확인했다.
그날 남은 것을 KAN-633(코드)과 KAN-634(서치 콘솔·공유 디버거 같은 운영 작업)로 나눠 적어 두고 2주 넘게 손대지
못했다. KAN-674를 마친 뒤 SEO 미완료 티켓을 훑다가 다시 꺼냈다.

착수 전에 티켓 네 항목이 정말 남아 있는지 코드와 prod로 하나씩 대조했다. 네 개 다 그대로였다.

## 옛 이름을 alternateName으로 잇기

### 전에는

`packages/domain/src/jsonld.ts`의 WebSite와 Organization 노드가 `alternateName: "Haechukimo"` 하나만 실었다.

WebSite JSON-LD(schema.org 구조화 데이터를 `<script type="application/ld+json">`으로 넣은 것)는 구글 검색 결과 맨 위
사이트명 줄을 정하는 1순위 출처다. `name`이 대표 이름이고, `alternateName`은 "이 사이트를 이렇게도 부른다"는 목록이다.
구글 사이트명 문서는 여기에 문자열 하나 대신 배열도 받는다.

### 무엇이 문제였나

이 서비스는 8월부터 "플릭"으로 검색 등록(KAN-348)을 했고, 그 이름으로 걸린 링크와 북마크, "플릭"·"PLick" 검색어가
남아 있다. 사이트가 스스로 "예전 이름이 플릭이다"라고 말하지 않으면, 구글 입장에서 옛 이름 신호와 새 이름 신호를 같은
사이트로 묶을 근거가 하나 줄어든다. 브랜드를 바꾼 사이트가 흔히 하는 처리가 옛 이름을 alternateName에 남기는 것이다.

### 어떻게 바꿨나

`@plick/domain/brand`에 `BRAND_FORMER_NAMES = ["플릭", "PLick"]`을 두고 이유를 주석으로 남겼다. `jsonld.ts`는
`[BRAND_NAME_EN, ...BRAND_FORMER_NAMES]`를 `ALTERNATE_NAMES` 하나로 만들어 두 노드가 같이 쓴다. 대표 이름(`name`)은
"해축이모" 그대로라 사이트명 표기는 바뀌지 않는다. 옛 이름은 대체 표기로만 들어간다.

### 바꾸고 나서

로컬 웹 홈 HTML에 `"alternateName":["Haechukimo","플릭","PLick"]`이 두 번(WebSite, Organization) 나왔고, 모바일
빌드의 `index.html`에도 같은 문자열이 있다. 두 앱 홈이 같은 빌더를 쓰기 때문이다. 회귀 테스트
`tests/unit/brand-jsonld.test.mjs`가 두 노드의 배열과 대표 이름을 확인한다.

## manifest를 brand 상수로 묶기

두 앱 `app/manifest.ts`는 `name`·`short_name`·`description`을 문자열로 직접 써 두고 있었다. 값은 맞았다. 다만 브랜드 문구의
단일 출처가 `@plick/domain/brand`인데 여기만 따로 놀아서, 다음에 문구를 바꾸면 빠뜨리기 쉬웠다.

manifest의 description("해외축구 이적 루머와 이슈 모음")은 태그라인(`BRAND_TAGLINE`, "해외축구 이슈 모음")과 한 단어가
다르고, 루트 title("해축이모 / 해외축구 이적 루머와 이슈 모음")의 뒷부분과는 같았다. 그래서 그 문구를 `BRAND_SUMMARY`로
꺼내고 `BRAND_TITLE`을 `${BRAND_NAME_KO} / ${BRAND_SUMMARY}`로 조립했다. manifest는 `BRAND_NAME_KO`와 `BRAND_SUMMARY`를 쓴다.

값이 정말 안 바뀌었는지는 바이트로 봤다. prod 두 호스트의 `/manifest.webmanifest`, 로컬 웹 dev의 같은 응답, 모바일 빌드의
`manifest.webmanifest.body`가 모두 같은 sha1(`31964d56…`)이다. title 문자열도 테스트가 고정한다.

## 옛 브랜드 주석

티켓을 쓸 때는 두 앱 레이아웃 JSDoc에 `"… | 플릭 PLick"` 예시가 있었는데, 그건 그사이 다른 작업에서 이미 고쳐져 있었다.
남은 건 웹 홈 `page.tsx`의 `브랜드 검색("plick", "플릭")` 한 줄이라 `("해축이모", 옛 이름 "플릭")`으로 바꿨다. 티켓 완료 조건의
`grep -rnE "플릭 PLick|\"plick\", \"플릭\"" apps`는 이제 0줄이다.

## 팀 OG 이미지에서 태그라인과 엠블럼이 겹치던 것

### 전에는

팀 허브와 기사 상세의 공유 카드는 `apps/web/app/_components/OgCard.tsx` 하나로 그린다. `next/og`의 `ImageResponse`(satori라는
엔진이 JSX를 1200x630 PNG로 그려 준다)가 쓰는 템플릿이다. 오른쪽에 팀 엠블럼을 옅은 워터마크로 깔고, 아래 줄에 해축이모 로고와
태그라인을 둔다.

워터마크는 470x470을 `top: 80, right: -36`에 뒀다. 세로로 80에서 550까지 내려온다. 아래 줄은 바깥 패딩(아래 60)과 로고 높이(64)
때문에 세로 506~570에 놓인다. 겹칠 수밖에 없는 배치였다. prod `plick.co.kr/teams/tottenham/og`를 받아 보면 "해외축구 이슈 모음"이
토트넘 엠블럼의 HOTSPUR 글자 위에 그대로 얹혀 있었다.

### 무엇이 문제였나

이 이미지는 카카오톡이나 인스타그램에 팀 링크를 공유하면 미리보기로 뜬다. 공유 카드의 브랜드 줄이 엠블럼 글자와 뒤섞여
보이면 리브랜딩 첫인상이 그대로 깎인다.

로컬에서 여섯 팀과 기사 하나(9679)를 렌더해 2열 격자로 붙여 놓고 봤다. 겹침이 토트넘만이 아니었다. 맨유(UNITED 리본),
첼시(FOOTBALL CLUB), 맨시티(CITY), 아스날 엠블럼을 쓰는 기사 카드까지 아래 글자가 태그라인 뒤에 깔렸다. 리버풀과 아스날 팀 카드는
엠블럼 모양 덕에 겹침이 거의 없었다.

### 어떻게 바꿨나

워터마크를 420x420으로 줄이고 `top: 52, right: -20`으로 올렸다. 세로 52에서 472까지라 아래 줄(506~)보다 30px 넘게 위에서 끝난다.
값은 `WATERMARK_SIZE`·`WATERMARK_TOP`·`WATERMARK_RIGHT` 상수로 빼고, 왜 그 숫자인지 주석에 계산을 남겼다. 기사 카드도 같은
컴포넌트라 같이 고쳐진다.

다른 방법으로 태그라인을 왼쪽 로고 옆으로 옮기는 것도 생각했다. 하지만 하단 좌우 배치는 리디자인 시안이 정한 것이라, 시안을
바꾸는 것보다 워터마크 크기를 조정하는 쪽이 작은 변경이었다.

### 바꾸고 나서

같은 일곱 장을 다시 격자로 렌더해 봤다. 일곱 장 모두 태그라인 뒤에 엠블럼이 없다. 맨유 카드는 제목("맨체스터 유나이티드 이적 루머")
끝이 엠블럼 왼쪽 가장자리에 닿는다. 이건 전에도 같았고, 워터마크가 옅어서 글자는 읽힌다. 손대지 않았다.

팀 OG 응답은 `s-maxage=86400`이라 CloudFront에 하루까지 남는다. 배포 뒤 공유 미리보기는 카카오·Meta 쪽 캐시도 따로 비워야 한다.
그건 KAN-634 몫이다.

## 남은 것

- KAN-634(운영): prod 배포 뒤 서치 콘솔과 서치어드바이저 재수집, 카카오·Meta 공유 디버거 캐시 초기화. 이번 변경(alternateName,
  팀 OG)이 prod에 나간 다음에 해야 재수집이 새 값을 가져간다.
- prod 배포 뒤 홈을 Rich Results Test에 넣어 WebSite·Organization이 오류 없이 읽히는지 본다. KAN-633의 완료 조건이다.

관련: [ADR 0171](0171-haechukimo-redesign.md)(해축이모 리디자인), KAN-384(사이트명과 alternateName의 출발), KAN-351(JSON-LD와 동적 OG).
