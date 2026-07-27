# 0047 — 공유 버튼: 링크 복사 팝업 (KAN-312)

- 상태: Accepted
- 날짜: 2026-07-27
- 범위: `apps/mobile`. 기사 세부 본문 아래 액션 줄의 공유 알약과 릴스 우측 액션 레일의 공유
  아이콘을 실제로 동작시킨다. 둘 다 같은 팝업을 열고, 팝업은 기사 세부 페이지 주소를 보여주며
  복사 버튼을 단다. BE 호출이 하나도 없는 첫 기능이라, 이번 작업은 계약 확인이 아니라 브라우저와
  웹뷰의 클립보드 동작을 파는 게 전부였다.
- 관련: [ADR 0044 기사 좋아요 API](0044-article-like-api.md) ·
  [ADR 0046 조회수 기록 API](0046-article-view-api.md) ·
  [ADR 0011 공용 경계](0011-shared-code-boundary.md) · `screen-publishing` 스킬

---

## 서버가 없는 티켓

지금까지 붙인 티켓은 전부 뒤에 엔드포인트가 있었다. 스웨거를 열고, `be-verify`에 계약을 물어보고,
응답 shape에 맞춰 타입을 손으로 매핑하는 게 작업의 앞부분이었다. 이번 티켓은 그게 통째로 없다.
BE에 공유 관련 엔드포인트가 없고, 있을 이유도 없다. 링크를 만드는 데 필요한 건 기사 id 하나이고
그건 이미 화면에 있다.

티켓이 요구한 건 세 가지다.

1. 기사 페이지에서 누르든 릴스에서 누르든 전부 기사 페이지 URL을 복사할 수 있게 한다.
2. 공유 버튼을 누르면 링크를 보여주고 복사 버튼이 달린 팝업을 띄운다.
3. 나중에 이 URL을 그대로 웹뷰로 감싸 모바일 앱으로 배포할 예정이니, 그 앱 안에서도 기기
   클립보드에 실제로 복사되게 한다.

1번과 2번은 화면 작업이라 금방 끝났다. 시간을 쓴 건 3번이다.

## 왜 네이티브 공유 시트가 아닌가

처음엔 `navigator.share`를 떠올렸다. Web Share API를 부르면 OS 공유 시트가 뜨고, 카카오톡이든
메시지든 사용자가 고르면 되니 훨씬 편하다. 그런데 티켓 2번이 "링크를 보여주며 이를 복사할 수 있는
버튼이 있는 팝업"이라고 화면을 못 박아 놨다. 공유 시트는 링크를 보여주지 않는다.

찾아보니 티켓이 오히려 안전한 선택이었다. `navigator.share`는 데스크톱 브라우저에서 상당수 없고,
안드로이드 WebView에서는 호스트 앱이 직접 `onShowFileChooser` 급의 연결을 해 주지 않는 한
동작하지 않는다. 3번이 말하는 "웹뷰로 감싸 배포"가 정확히 그 환경이다. 시트를 기본으로 삼으면
가장 중요한 배포 형태에서 아무 일도 안 일어나는 버튼이 된다. 링크를 눈에 보이게 두는 팝업은
최악의 경우에도 사용자가 주소를 직접 집어갈 수 있다. 그래서 티켓대로 갔다.

## 릴스에서 눌러도 기사 주소

릴스 공유가 어떤 주소를 줘야 하는지가 잠깐 걸렸다. 릴스 화면 자체의 주소(`/reels`)를 주면
링크를 받은 사람은 그 릴이 아니라 남의 피드 첫 장을 보게 된다. 릴스는 커서 페이지네이션이라
특정 릴을 가리키는 주소가 애초에 없다(ADR 0032). `/reels/{id}` 같은 라우트를 새로 파는 것도
생각했지만, 그건 이 티켓 범위 밖이고 티켓 1번이 명시적으로 "전부 기사페이지의 url"이라고 했다.

다행히 붙이는 건 한 줄이다. PLick에서 릴과 기사는 표현만 다르고 같은 `article_summaries` 한
행이라, 릴 카드의 `id`가 곧 기사 id다. 좋아요(KAN-308)와 조회 기록(KAN-310)이 엔드포인트를
하나만 쓴 것과 같은 이유다. 그래서 릴에서든 기사에서든 `/articles/{id}` 하나가 나온다.

## origin을 어디서 얻나

주소를 만들려면 도메인이 필요하다. 처음엔 `NEXT_PUBLIC_SITE_URL` 같은 걸 env에 박을까 했는데
안 했다. 이 앱은 배포된 URL을 웹뷰가 그대로 띄우는 구조다(티켓 3번). 즉 웹뷰가 지금 보고 있는
origin이 곧 공유해야 할 origin이다. env로 박으면 로컬에서 눌렀을 때 배포 도메인이 복사되고,
프리뷰 배포에서 눌렀을 때도 운영 도메인이 복사된다. 지금 보고 있는 곳과 다른 주소가 복사되는
건 디버깅할 때 사람을 헷갈리게 만든다.

그래서 `window.location.origin`을 쓴다. 대신 이건 서버에 없는 값이다. Next의 서버 컴포넌트는
Node에서 도는 코드라 `window`도 `location`도 없고, 건드리면 렌더 중에 터진다. 그래서 주소는
마운트 뒤에만 만든다.

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

const url = mounted ? articleShareUrl(articleId) : "";
const { status, copy } = useCopyLink(url);

if (!mounted) return null;
```

여기서 한 가지 조심할 게 있었다. `if (!mounted) return null`을 훅보다 위에 두면 안 된다. 리액트
훅은 렌더마다 같은 순서로 같은 개수가 불려야 하는데, 중간에 return이 끼면 첫 렌더에서는 훅이
두 개, 마운트 뒤에는 세 개가 불려서 "Rendered more hooks than during the previous render"로
터진다. 그래서 훅을 전부 부른 뒤에 마지막에 return을 둔다. 첫 렌더에서 `useCopyLink("")`가
빈 문자열로 불리지만, 그 렌더는 어차피 null을 그리고 끝나므로 문제가 없다.

## 클립보드 — API 하나로는 부족했다

`navigator.clipboard.writeText(text)`가 표준이다. 프로미스를 주고, 성공하면 끝이다. 문제는 이게
언제 없느냐다. 파고들어 보니 막히는 층이 두 개다.

첫째, Clipboard API는 보안 컨텍스트(secure context)에서만 존재한다. https이거나 localhost일
때만이라는 뜻이다. 사내망 http 주소나 `file://`로 띄운 화면에서는 `navigator.clipboard` 자체가
`undefined`다. 옵셔널 체이닝 없이 `.writeText`를 부르면 그 자리에서 TypeError다.

둘째, 보안 컨텍스트여도 안드로이드 WebView는 호스트 앱이 권한을 열어 줘야 쓸 수 있다. 이때는
객체는 있는데 프로미스가 reject된다. 즉 `try/catch`와 존재 확인이 둘 다 필요하다.

폴백은 옛날 방식인 `document.execCommand("copy")`다. 사양상 폐기(deprecated)됐지만 브라우저가
실제로 걷어내지는 않았고, Clipboard API가 막힌 웹뷰에서도 대개 살아 있다. 동작 원리가 다르기
때문이다. 이건 "이 텍스트를 클립보드에 넣어라"가 아니라 "지금 선택된 영역을 복사하라"는 명령이다.
그래서 값을 넣을 곳과 선택 상태를 직접 만들어 줘야 한다.

```ts
const field = document.createElement("textarea");
field.value = text;
field.contentEditable = "true";
field.readOnly = true;
field.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
document.body.appendChild(field);

const range = document.createRange();
range.selectNodeContents(field);
const selection = window.getSelection();
selection?.removeAllRanges();
selection?.addRange(range);
field.setSelectionRange(0, text.length);
```

`contentEditable`과 Range가 붙은 건 iOS 때문이다. 데스크톱과 안드로이드는 `field.select()` 한
줄이면 선택이 잡히는데, iOS WKWebView는 `readonly` textarea에서 `select()`가 선택 범위를 만들지
않는다. 그러면 `execCommand("copy")`가 예외도 없이 그냥 `false`를 돌려주고 아무 일도 안 일어난다.
`contentEditable`을 켠 뒤 Range로 내용 전체를 직접 선택 범위에 넣어야 먹는다.

`position: fixed`에 `opacity: 0`인 건 깜빡임과 스크롤 점프를 막기 위해서다. 화면 밖(`left:
-9999px`)으로 밀어내는 흔한 방식도 있는데, 그러면 선택이 잡히는 순간 브라우저가 그 요소를
보여주려고 스크롤을 옮겨 버린다.

두 방법이 다 실패하면 `false`를 돌려주고, 팝업이 "주소를 길게 눌러 직접 복사해 주세요."로
떨어진다. 주소 원문을 팝업에 늘 그려 두는 이유가 이거다. `select-all`을 걸어 둬서 한 번만 눌러도
전체가 잡힌다.

## 상태를 어디에 두나

복사 결과 표시는 훅으로 뺐다(`useCopyLink`). 상태는 `"idle" | "copied" | "failed"` 셋이다.

성공은 1.6초 뒤 원래 라벨로 되돌린다. 팝업을 닫지는 않는다 — 복사한 주소를 눈으로 확인하는 게
이 팝업의 목적이라 자동으로 닫으면 방금 뭘 복사했는지 확인할 방법이 없어진다.

실패는 되돌리지 않는다. 안내 문구를 읽고 주소를 직접 집어가야 하는 상황인데 문구가 1.6초 만에
사라지면 왜 안 됐는지 알 길이 없다. 다시 누르면 그때 다시 판정한다.

타이머는 언마운트와 재시도 때 정리한다. 안 그러면 팝업을 닫은 뒤에 `setStatus`가 늦게 불려
사라진 컴포넌트의 상태를 건드린다.

## 팝업을 body로 뚫는 이유 (다시)

`ShareDialog`는 `createPortal(…, document.body)`로 그린다. 이건 KAN-308에서 이미 한 번 겪은
문제라 그대로 따랐다. 릴스 액션 레일에는 `drop-shadow` 필터가 걸려 있는데, CSS에서 `filter`나
`transform`이 걸린 조상은 그 안쪽 `position: fixed`의 기준 상자(containing block)가 된다.
보통 `fixed`는 뷰포트를 기준으로 잡히지만 이 경우는 아니다. 그래서 팝업을 레일 안에 두면
`inset-0`이 화면이 아니라 레일 크기에 맞춰져서, 화면 전체를 덮어야 할 스크림이 우측 아이콘
뭉치만 덮는다. body 밑으로 옮기면 어디서 부르든 화면 전체를 덮는다.

릴 세부 시트도 `translateY`로 오르내리므로 같은 함정이 있다. 공유 팝업은 지금 레일에서만 열지만,
나중에 시트 안에 공유 버튼이 생겨도 포털이라 그대로 동작한다.

## 서버 컴포넌트에서 버튼만 떼어내기

기사 세부 본문(`ArticleBody`)은 서버 컴포넌트다. 공유 버튼은 클릭 상태가 필요하니 클라여야 하는데,
`"use client"`를 본문 파일에 붙이면 문단·태그·추천 카드까지 전부 클라 번들에 실린다. 그래서
`ArticleShareButton`이라는 클라 컴포넌트로 버튼만 떼어 냈다. 좋아요 버튼(KAN-308)이 이미 같은
모양으로 떨어져 있어서 그 옆에 나란히 세우면 됐다.

릴스는 반대다. 이미 전부 클라 컴포넌트라 경계를 새로 그을 게 없다. 레일(`ReelActionRail`)은
표시와 탭만 맡는 조각이라 `onShare` 콜백만 받고, 열림 상태와 팝업은 부모인 `ReelItem`이 든다.
좋아요의 비로그인 팝업이 같은 자리에 있는 것과 같은 배치다.

## 검증

브라우저 프리뷰로 두 자리를 다 눌러 봤다.

릴스에서 공유를 누르면 팝업이 화면 전체를 덮고(포털이 제대로 먹었다는 뜻이다) 주소가
`http://localhost:3001/articles/7290`으로 나온다. 릴 id가 그대로 기사 경로에 붙은 것이다.
기사 세부에서 누르면 같은 주소가 나온다.

복사 자체를 확인할 때 한 번 헤맸다. 콘솔에서 `btn.click()`으로 눌렀더니 계속 실패 안내가 떴다.
버그인 줄 알았는데 아니었다. 클립보드는 Clipboard API든 `execCommand`든 사용자 제스처
(user gesture) 안에서만 허용된다. 스크립트가 만든 클릭은 제스처로 안 쳐 준다. 즉 이건 폴백까지
정확히 다 타고 내려가 실패로 떨어진 것이니, 오히려 실패 경로가 의도대로 도는 걸 본 셈이다.

실제 포인터로 누르니 라벨이 `복사했어요`로 바뀌고 1.6초 뒤 `링크 복사`로 돌아왔다. MutationObserver를
걸어 두고 실제 클릭을 날려 라벨 변화를 기록해 확인했다. 다크·라이트 둘 다 봤고 콘솔 에러는 없다.

## 남긴 것

`apps/web`에도 같은 자리에 공유 버튼이 있다. 손대지 않았다. 이 티켓은 `[FE] Mobile API` 에픽
아래에 있고, 웹은 아직 목데이터로 도는 화면이라 이번 범위에 넣지 않았다. 팝업 자체를
`@plick/ui`로 올릴지는 웹을 실제로 붙일 때 ADR 0011 게이트로 다시 판단하면 된다. 지금 올리면
쓰는 곳이 하나인 컴포넌트를 공용 패키지에 미리 올려 두는 꼴이다.
