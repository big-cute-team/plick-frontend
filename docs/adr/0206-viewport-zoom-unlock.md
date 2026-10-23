# 0206. 뷰포트의 확대 금지 두 줄을 걷어내고, 막던 것을 다른 자리로 옮기기 (KAN-669)

## 티켓

KAN-669는 KAN-626의 재발행이다. KAN-626은 "완료"로 닫혀 있었는데 코드에 반영된 적이 없었다. `origin/main`의
`apps/mobile/app/layout.tsx` `viewport` export에 `maximumScale: 1, userScalable: false`가 그대로 있고, KAN-626
키가 붙은 커밋도 없다. 2026-10-23 prod 재측정(KAN-667 뒤)에서 모바일 6개 화면 전부 Lighthouse `meta-viewport`
감사에 실패했고, HTML에 `user-scalable=no, maximum-scale=1`이 찍혀 있었다. 접근성 점수(86~94)의 가장 큰
단일 감점이다.

`develop`(KAN-667 머지 직후)에서 `feature/KAN-669-viewport-zoom-unlock`을 땄다.

## 왜 잠갔었나부터

두 줄을 그냥 지우면 되는 일이 아니다. 넣은 이유가 있었고 그 이유가 아직 유효한지 봐야 했다. 기록은
[ADR 0107](0107-webview-zoom-lock.md)에 있다. 2026-08-27, 앱 셸(WKWebView)로 감싼 실기기 테스트에서 증상이
둘 나왔다. 댓글 입력창을 탭하면 화면이 저 혼자 커지는 것, 두 손가락으로 벌리면 핀치 줌이 먹는 것.

둘은 원인이 다르다. 첫째는 iOS의 접근성 동작이다. Safari든 WKWebView든 input이나 textarea에 포커스가 가면
그 요소의 글자 크기를 보고, 16px 미만이면 화면 전체를 자동으로 확대한다. 댓글 입력창은 당시 `text-body`
13.5px라 정확히 걸렸다. `maximum-scale=1`을 주면 iOS가 "확대할 여지가 없다"고 보고 이 자동 확대를 하지
않는다. 둘째는 뷰포트에 확대 제한이 없으면 WKWebView가 기본값대로 핀치 줌을 허용하는 것이고,
`user-scalable=no`가 이걸 막는다.

그때 "일반 Safari는 iOS 10부터 `user-scalable=no`를 무시하니 브라우저 사용자의 접근성은 살아 있다"고
정리했었다. 그 말은 맞지만 Lighthouse는 HTML에 적힌 값으로 판정한다. 브라우저가 무시하든 말든 메타에
`user-scalable=no`나 5 미만의 `maximum-scale`이 있으면 `meta-viewport`는 실패다. 그래서 점수가 깎인다.

## 앱 셸 쪽 확인

티켓은 "핀치 줌을 막은 이유가 있었는지(앱 셸 WebView) 확인한다"고 했다. 앱 셸 저장소(plick-AppShell)의
클로드에게 티켓 댓글을 달아 달라고 해 두었고, 그 댓글을 읽는 것으로 시작했다. 요지는 이렇다.

앱 셸 1.2.0에 확대 차단이 셸 자체로 들어가 있다(`BLOCK_PAGE_ZOOM`, plick-AppShell PR #25). Android는
WebView 내장 줌(핀치·더블탭)을 끄고, iOS는 문서 로드 시작 시점에 viewport meta를 `maximum-scale=1,
user-scalable=no`로 고쳐 쓰고 MutationObserver로 유지한다. 1.2.0은 양쪽 스토어에 라이브다(App Store
2026-10-19, Play 프로덕션 1.2.0). 그러니 웹이 meta를 풀어도 1.2.0 이상 앱에서는 핀치와 더블탭 확대가
계속 막힌다. 셸 주입은 앱 안에서만 도니 Lighthouse 감사에는 영향이 없다.

조정이 필요한 것도 짚어 주었다. 티켓 완료 조건의 "앱 셸 WebView에서 핀치 줌 뒤 되돌아오는지 확인"은
앱 안에서는 설계상 핀치 자체가 안 되므로(릴스 세로 스냅과 시트 드래그 보호, 2026-10-14 결정) "Safari는
핀치 뒤 복귀 확인, 앱 셸은 확대가 안 되는지 확인"으로 읽어야 한다. 그리고 `touch-action: manipulation`은
넣어 두라고 권했다. 1.2.0 미만 구버전 앱은 강제 업데이트가 없어서 meta가 풀리는 순간 확대가 열리는데,
이 CSS가 구버전에서도 더블탭 확대는 막아 준다(핀치는 구버전에서 열리고, 그건 감수).

결론은 웹이 meta를 풀어도 된다는 것이고, ADR 0107의 두 원인 중 핀치 쪽은 셸이 넘겨받았다. 남는 건 iOS
입력창 자동 확대다. 이건 Safari 사용자에게 그대로 되살아나므로 웹이 다른 방법으로 막아야 한다.

## 바꾼 것

### viewport 두 줄 제거

`layout.tsx`의 `viewport`에서 `maximumScale`과 `userScalable`을 뺐다. `width`, `initialScale`, `viewportFit:
"cover"`, `themeColor`는 그대로다. 렌더된 메타는 이렇게 나온다.

```
width=device-width, initial-scale=1, viewport-fit=cover
```

주석도 다시 썼다. 전 주석은 "이 두 줄이 무엇을 막는가"였는데, 이제는 "왜 두지 않는가"와 "막던 것이 어디로
갔는가"를 적어 두어야 다음 사람이 다시 넣지 않는다.

### 더블탭 확대는 `touch-action: manipulation`

`globals.css`의 `html`에 `touch-action: manipulation`을 넣었다. `touch-action`은 "이 요소 위의 터치 중
브라우저가 직접 처리해도 되는 제스처"를 선언하는 CSS 속성이다. `manipulation`은 팬(스크롤)과 핀치 줌은
허용하고 더블탭 확대만 끄는 값이다. 핀치는 접근성이라 살려 두고, 탭이 잦은 UI(좋아요, 탭 바)에서 두 번
탭이 화면을 키우는 것만 막는 셈이다.

릴스가 걱정이었다. 릴스 뷰포트는 [ADR 0031](0031-reels-embla-carousel.md)에서 `touch-pan-x
touch-pinch-zoom`(`touch-action: pan-x pinch-zoom`)을 걸어 세로 제스처를 브라우저가 가로채지 않고 Embla의
포인터 핸들러로 보낸다. `touch-action`은 조상까지 교차(intersect)해서 계산되는데, `manipulation`은 `pan-x
pan-y pinch-zoom`과 같은 뜻이라 자식의 `pan-x pinch-zoom`과 교차해도 `pan-x pinch-zoom`이 남는다. 세로 팬은
여전히 빠져 있으니 Embla에 가는 입력은 전과 같다.

html 한 곳에만 둬도 되는가는 따로 따져 봤다. 포인터 이벤트 명세는 "그 제스처의 기본 동작을 가진 요소"까지
조상을 거슬러 올라가며 교차하라고 한다. 팬은 가장 가까운 스크롤 컨테이너가 그 요소라 거기서 멈추지만,
더블탭 확대와 핀치는 뷰포트의 동작이라 루트까지 올라간다. 그러니 `ScrollArea` 같은 중첩 스크롤러 안의
더블탭에도 html의 값이 닿는다. WebKit은 아예 부모의 유효값과 자기 값을 교차해 상속하는 식으로 계산하므로
더 단순하게 전 요소에 퍼진다. 헤드리스 리뷰가 이 지점을 WARN으로 짚었는데, 위 이유로 바꾸지 않았다. 시트 드래그처럼 `touch-none`을 쓰는 곳은 `none`과
교차하면 `none`이라 역시 그대로다.

### iOS 입력창 글자 16px 바닥

iOS의 포커스 자동 확대는 글자 크기가 조건이니 글자 크기로 조건을 없앴다. `globals.css`에 iOS WebKit에서만
먹는 블록을 하나 두었다.

```css
@supports (-webkit-touch-callout: none) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
  textarea,
  select {
    font-size: 16px;
  }
}
```

선택자는 포커스로 키보드나 피커가 뜨는 컨트롤만 고른다. 처음엔 `input`에서 체크박스·라디오·range만 뺐는데,
리뷰가 submit·button·file 같은 것도 걸린다고 해서 텍스트류와 날짜·시간, `textarea`, `select`를 적는 쪽으로
뒤집었다. 버튼류는 자동 확대 대상이 아니고 글자를 키우면 모양만 바뀐다.

`-webkit-touch-callout`은 iOS Safari(와 iOS의 모든 브라우저, 전부 WebKit이다)만 아는 속성이라 `@supports`로
분기하면 Android는 디자인 크기를 그대로 둔다. 지금 입력창은 댓글·채팅이 `text-label-lg`(0.78125rem, html
110%를 곱해 13.75px), 닉네임이 `text-body-md`(15.4px)라 전부 16px 미만이다. ADR 0107 때 "입력창 폰트를
16px로 키우면 댓글 UI 밀도가 흐트러진다"고 이 길을 버렸는데, 이번엔 iOS Safari에만 적용되고 앱 안(1.2.0
이상)은 셸이 meta를 다시 잠가 자동 확대가 애초에 안 일어나므로 셸 안 밀도는 그대로다. 16px은 디자인
토큰이 아니라 iOS가 정한 문턱값이라 px로 박았다. `apps/CLAUDE.md`의 "선 두께와 앱 셸 최대폭만 px" 규칙의
예외이고 주석에 그 이유를 적었다.

우선순위도 봐야 했다. 입력창의 글자 크기는 Tailwind 유틸리티 클래스(`text-label-lg`)가 정하고, Tailwind v4는
유틸리티를 `@layer utilities`에 넣는다. CSS 캐스케이드에서 레이어 밖(unlayered) 규칙은 특이도와 무관하게
어떤 레이어 안의 규칙보다 이긴다. `globals.css`의 이 블록은 레이어 밖이라 유틸리티를 덮는다. 반대로 말하면
앞으로 iOS에서 입력창을 16px보다 크게 쓰고 싶어도 이 규칙에 눌리니, 그때는 이 블록을 손봐야 한다.
[리디자인 검증 메모](../adr/0171-haechukimo-redesign.md)에서 "theme.css 레이어 밖 규칙 함정"이라고 적어 둔
것과 같은 메커니즘인데 이번엔 그 성질을 일부러 썼다.

## 검증

로컬 dev를 prod BE로 붙여(`API_BASE_URL=https://plick.co.kr/be`) 띄우고 메타 태그와 빌드된 CSS를 curl로
확인했다. 메타는 위 문자열대로, CSS에는 `html { touch-action: manipulation }`과 `@supports` 블록이 들어 있었다.

제스처는 브라우저 패널로는 볼 수 없어서 iOS 시뮬레이터(iPhone 17 Pro, iOS 26.5) Safari로 봤다.
시뮬레이터 Safari는 호스트의 `localhost`가 아니라 `127.0.0.1`로 들어가야 붙는다.

- 기사 세부(`/articles/9659`)의 댓글 입력창을 탭했다. 커서가 들어가고 키보드 보조 바가 떴지만 화면 배율은
  그대로였다. 전에 `maximum-scale=1`이 막던 자동 확대를 16px 바닥이 대신 막은 것이다.
- 같은 화면에서 두 손가락을 벌리니 약 2배로 확대됐다. 전에는 `user-scalable=no`가 WKWebView에서만 막고
  Safari에선 원래 됐으니 이건 변화가 아니라 "여전히 된다"는 확인이다.
- 릴스(`/reels`)에서 벌리면 확대되고, 오므리면 1배로 돌아오며 레이아웃이 깨지지 않았다. 오므리는 도중
  스크린샷에는 1배보다 작게 찍힌 장면이 있는데, Safari가 제스처 중에는 1배 아래로도 보여 주다가 손을 떼면
  튕겨 돌아오는 고무줄 동작이다.

한 가지가 막혔다. 시뮬레이터에서 릴스를 위로 쓸어도 다음 릴로 넘어가지 않았다. `touch-action` 때문인지
확인하려고 그 한 줄을 뺀 CSS로 다시 해 봤는데 똑같이 안 넘어갔고, 배포된 dev(`dev-m.plick.co.kr`)에서는
넘어갔다. 그러니 내 변경과 무관하다. 원인은 dev 서버 로그에 있었다. Next 16 dev 서버는 `allowedDevOrigins`에
없는 출처(`127.0.0.1`)의 dev 리소스 요청을 막는다. HMR 웹소켓 경고가 그것이고, 같은 이유로 클라이언트
번들이 제대로 붙지 않아 Embla가 초기화되지 않은 것으로 보인다. 입력창 포커스와 핀치는 브라우저 네이티브
동작이라 JS 없이도 되니 그 검증은 유효하다. 릴스 스와이프 회귀는 `next build` 산출물을 `next start`로 띄워
다시 봤다. `pnpm build`를 돌린 뒤 `mobile-prodbe-alt`(3061)로 올리고 같은 경로로 들어가니 위로 쓸면 다음
릴로 스냅했다. 산출물 CSS에 `touch-action:manipulation`과 `@supports (-webkit-touch-callout:none)` 블록이
들어 있는 것도 curl로 확인했으니, 새 규칙이 있는 상태에서 세로 스냅이 그대로라는 뜻이다.

dev 서버에서 또 하나 헤맨 것. CSS 한 줄을 빼고 서버를 재기동해도 curl로 받은 CSS에 그 줄이 그대로 있었다.
파일에 표식 한 줄을 덧붙이자 그제야 새 CSS가 나왔다. Turbopack이 재기동 직후 옛 산출물을 내고 다음 편집이
있어야 다시 만든다. [메모](../adr/0199-no-store-bfcache-problem.md)에 적어 둔 "기동 직후 옛 코드"
함정과 같은 것이다. 전후 비교를 하려면 표식부터 넣고 그게 서빙되는지 본 뒤에 비교해야 한다.

lint, check-types, format:check, test:hooks, test:unit, build 모두 통과했다.

## 남은 것

- prod 배포 뒤 모바일 6개 화면 Lighthouse 재측정. `meta-viewport`가 통과하면 접근성 점수가 오르고, 95
  이상은 접근성 잔여 묶음(KAN-627, KAN-628)과 합쳐서 본다
- 앱 셸 쪽 실기기 확인(plick-AppShell docs/todo/012): Android 핀치 차단, Next 클라이언트 라우트 이동 뒤에도
  iOS 차단이 유지되는지, 릴스 스와이프·시트 드래그·댓글 입력 회귀. 웹 PR이 머지되면 셸 쪽에 알린다
- 1.2.0 미만 앱에서는 핀치 확대가 열린다. 더블탭만 `touch-action`이 막는다
