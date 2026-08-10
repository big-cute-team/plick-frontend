# 0086. SEO 후속 작업 일괄 (KAN-380)

2026-08-10. [SEO 전략 계획](../seo-strategy.md)(KAN-345)에서 아직 안 한 것들을 한 티켓으로 묶어
처리하는 세션이다. Step 0~1의 코드 몫(ADR 0070, 0071)과 Step 2의 팀 허브·JSON-LD·동적 OG
(ADR 0072, 0073)까지는 이미 들어가 있고, 남아 있던 건 이렇다.

- Step 2-6 캐시 전략
- Step 2-5 시맨틱 마크업 감사
- Step 3-5의 측정 수단(GA4)
- manifest
- 배포 후 운영 작업: Search Console·네이버 등록(1-6), 실배포 검증(1-7), Core Web Vitals(3-3),
  thin content BE 협업(3-2), 백링크(3-4)

`/reels/[postId]`(2-1)과 서비스 소개 페이지(3-1)는 이번 범위에서 뺐다. 둘 다 화면이 새로
생기는 작업이라 SEO 후속 정리와 성격이 다르고, 별도 티켓으로 잡는 게 맞다고 봤다.

그리고 전략 문서에는 없던 구멍이 하나 새로 보였다. 그것부터 막았다.

## 1. dev 도메인이 색인되고 있었다

전략 문서(2026-08-03)를 쓸 때는 도메인이 `plick.co.kr`과 `m.plick.co.kr` 두 개였다. 그 뒤
KAN-377에서 개발/실서비스 환경을 분리하면서 `dev.plick.co.kr`과 `dev-m.plick.co.kr`이 생겼고
(ADR 0083, 0084), develop 브랜치가 푸시될 때마다 여기로 배포된다.

문제는 robots와 메타데이터가 환경을 구분하지 않는다는 거였다. `app/robots.ts`는 환경과 무관하게
`Allow: /`에 사이트맵 위치까지 적어 내려주고 있었고, 그 사이트맵은 dev 빌드에 굳은
`NEXT_PUBLIC_SITE_URL`을 그대로 써서 dev 도메인 기준 URL 전건을 나열했다. 즉 dev 사이트가
prod와 완전히 같은 콘텐츠를 크롤러에게 "여기 다 있습니다" 하고 안내하는 상태였다.

이게 왜 나쁘냐면, 구글 입장에서 `plick.co.kr/articles/8032`와 `dev.plick.co.kr/articles/8032`는
같은 내용의 서로 다른 URL이다. 중복 콘텐츠로 판단되면 둘 중 하나를 대표로 고르고 나머지를
접는데, 이 선택이 항상 우리가 원하는 쪽으로 가지 않는다. 최악의 경우 dev 도메인이 대표로 잡혀
검색 결과에 개발 서버 주소가 노출된다. ADR 0070에서 canonical을 apex 한쪽으로 모으려고 공들인
걸 dev가 옆에서 새는 구조였다.

### robots.txt로 막을 것인가, noindex로 막을 것인가

여기서 한 번 방향을 틀었다. 처음엔 dev robots.txt를 `Disallow: /` 한 줄로 바꿨다. 제일
직관적이고 흔한 방법이다. 그런데 코드를 커밋하기 전에 다시 생각해 보니, 이 둘은 같은 일을
하는 장치가 아니다.

- `Disallow: /`는 크롤 금지다. "이 URL을 가져가서 읽지 마라"까지고, 색인 금지가 아니다.
  구글은 크롤하지 않은 URL도 외부 링크만 있으면 URL 자체를 색인할 수 있다(제목만 있고 설명
  자리에 "이 페이지에 대한 정보를 제공할 수 없습니다"가 뜨는 그 결과다).
- `noindex` 메타 태그는 색인 금지다. 대신 크롤러가 페이지를 실제로 가져와서 HTML을 읽어야
  전달된다.

둘을 같이 걸면 어떻게 되냐면, robots.txt가 먼저 평가되어 크롤이 막히고, 그래서 크롤러는 페이지
안의 noindex를 영영 읽지 못한다. 색인을 지우고 싶을 때 지울 수단이 없어진다. 안전장치를 두 개
걸었다고 생각했는데 실제로는 강한 쪽 하나가 약한 쪽을 무력화하는 조합이다.

dev URL이 밖으로 샐 경로가 없느냐 하면 그것도 아니다. 배포 워크플로 로그, PR 본문, 팀 메신저
어디든 주소가 적힐 수 있다. 그래서 크롤은 열어 두고 색인만 확실히 막는 쪽으로 갔다.

- dev robots.txt: 기존 규칙 그대로 두되 `Sitemap:` 줄만 뺀다. 크롤러에게 URL 전건 목록을 손에
  쥐여 줄 이유는 없다. 발견은 알아서 하되 도와주지는 않는 정도.
- dev 전 페이지: `<meta name="robots" content="noindex, nofollow">`. 발견되더라도 색인은 안 된다.

크롤러 트래픽이 dev로 조금 들어오게 되는데, ASG EC2 한 대 기준으로 무시할 수준이라 트레이드오프를
받아들였다.

### 판정을 어디서 하나

환경 판정용 플래그를 새로 만들지 않고 이미 있는 것에서 유도했다.

```ts
/** 실서비스 모바일 도메인. 색인 허용 판정의 기준값이라 리터럴로 둔다. */
const PROD_SITE_URL = "https://m.plick.co.kr";

export const IS_PRODUCTION_SITE = SITE_URL === PROD_SITE_URL;
```

`SITE_URL`은 `NEXT_PUBLIC_SITE_URL`에서 오고, 이 값은 deploy.yml의 빌드 스텝이 브랜치에 따라
넣어 준다(main이면 실도메인, 그 외면 dev 도메인). `NEXT_PUBLIC_` 접두사가 붙은 환경변수는
런타임에 읽히는 게 아니라 빌드 시점에 번들 안으로 문자열 리터럴로 치환되어 굳는다(ADR 0070에
적어 둔 `API_BASE_URL`과 같은 제약이다). 그래서 위 비교도 빌드 시점에 결과가 확정된다. 환경변수를
하나 더 늘려서 오설정 가능성을 만드는 것보다, 이미 배포에서 관리되는 값 하나에서 파생시키는 쪽이
어긋날 여지가 적다고 봤다. 로컬 개발(`http://localhost:3001`)도 자연스럽게 non-prod로 떨어진다.

robots는 이렇게 갈라진다.

```ts
const rules = {
  userAgent: "*",
  allow: "/",
  disallow: ["/api/", "/oauth/", "/me/", "/onboarding/"],
};

if (!IS_PRODUCTION_SITE) {
  return { rules };
}

return { rules, sitemap: `${SITE_URL}/sitemap.xml` };
```

noindex는 루트 레이아웃 메타데이터 한 줄이다.

```ts
robots: IS_PRODUCTION_SITE ? undefined : { index: false, follow: false },
```

Next의 Metadata API는 세그먼트별로 병합되면서 아래쪽이 이긴다. 하위 페이지들이 robots 키를
따로 선언한 곳이 한 군데도 없어서, 루트의 이 한 줄이 전 라우트에 그대로 상속된다. prod에서는
`undefined`라 메타 태그 자체가 안 나가고, 태그가 없는 건 크롤러에게 기본값(색인 허용)이다.
`noindex` 대신 `undefined`를 넣는 게 중요한데, `{ index: true }`를 명시하면 `index, follow`
태그가 실제로 출력된다. 틀린 건 아니지만 없어도 되는 태그라 안 내보내는 쪽을 골랐다.

사이트맵 라우트 자체(`/sitemap.xml`)는 dev에서도 그대로 응답한다. robots가 안내하지 않을 뿐
직접 열면 나온다. 여기까지 막을까 했는데, 그러면 로컬에서 사이트맵이 제대로 만들어지는지
확인할 수단이 사라진다. 사이트맵에 실린 페이지들이 전부 noindex라 색인 위험은 없으므로
그대로 뒀다.

### 검증

로컬 dev 서버(mobile 3001, web 3000)로 확인했다. 로컬은 non-prod 분기를 타므로 dev 배포와
같은 결과가 나온다.

- `/robots.txt` 양쪽 모두 규칙은 그대로고 `Sitemap:` 줄이 사라졌다.
- `/signup`의 `<meta name="robots">`가 두 앱 모두 `noindex, nofollow`. canonical은
  `http://localhost:3000/signup`으로 여전히 데스크톱을 가리킨다(ADR 0070 A안 유지).
- format:check, lint, check-types 통과.

prod 분기는 조건식 한 줄 위쪽이고 기존 동작 그대로라 별도로 빌드해 보지는 않았다. 배포 후
`https://plick.co.kr/robots.txt`에 `Sitemap:` 줄이 있고 페이지에 robots 메타가 없는 걸
확인하는 게 아래 운영 작업(1-7)에 포함된다.
