# 0107. 앱 웹뷰에서 화면이 지혼자 확대되는 문제 — viewport 두 줄로 잠그기

날짜: 2026-08-27

## 무슨 일이 있었나

PLick 모바일 웹을 네이티브 앱으로 감싸서(WKWebView) 실기기 테스트를 하다가 영상 하나를 받았다.
댓글 입력창을 탭하는 순간 화면이 저 혼자 확 커지고, 두 손가락으로 벌리면 핀치 줌도 그대로 먹는다.
네이티브 앱이라면 절대 일어나지 않을 동작이라 웹뷰 티가 확 나는 순간이었다.

증상이 두 개라서 처음에는 하나의 원인인 줄 알았는데, 파 보니 각각 다른 메커니즘이었다.

## 원인 1: 입력창 탭하면 저절로 확대되는 것

iOS(Safari든 WKWebView든)는 input이나 textarea에 포커스가 갈 때 그 요소의 폰트 크기를 본다.
16px 미만이면 "글자가 작아서 사용자가 못 읽겠다"고 판단해 화면 전체를 자동으로 확대해 준다.
접근성 배려로 들어간 동작인데, 우리처럼 앱을 흉내 내는 웹에서는 재앙이다.

우리 댓글 입력창(`CommentComposer`)은 `text-body` 토큰을 쓰고, 이 값이 13.5px다.
정확히 자동 확대 조건에 걸린다. 릴스 상세 시트의 댓글 입력도, 기사 댓글도 전부 같은 토큰이라
어디서 입력을 열든 동일하게 확대됐다.

## 원인 2: 핀치 줌이 되는 것

루트 레이아웃의 viewport 설정이 이랬다.

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d12",
};
```

`initialScale: 1`은 처음 로드될 때의 배율만 고정할 뿐, 이후 사용자가 확대하는 것을 막지 않는다.
`maximum-scale`과 `user-scalable` 제한이 없으니 WKWebView는 기본값대로 줌을 허용한다.
브라우저에서는 당연한 동작이라 여태 아무도 문제 삼지 않았는데, 앱으로 감싸는 순간 어색해졌다.

## 해결: viewport 두 줄

고칠 방법은 두 갈래였다.

하나는 입력창 폰트를 16px로 키우는 것. 자동 확대의 근본 조건을 없애는 방법이지만,
13.5px는 디자인 스케일에서 나온 값이라 이것 때문에 키우면 댓글 UI 전체의 밀도가 흐트러진다.
그리고 이 방법으로는 핀치 줌은 어차피 못 막는다.

다른 하나는 viewport 메타에서 줌 자체를 잠그는 것. 이걸 택했다.

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0d12",
};
```

`maximumScale: 1`이 원인 1을 잡는다. iOS는 포커스 자동 확대를 할지 판단할 때 이 값을 존중해서,
최대 배율이 1이면 확대할 여지가 없다고 보고 자동 줌을 아예 하지 않는다.
`userScalable: false`가 원인 2를 잡는다. WKWebView는 이 메타 값을 그대로 따라 핀치 제스처를 무시한다.

## user-scalable=no는 접근성 문제 아닌가

이 조합을 쓸 때 늘 나오는 지적이 "저시력 사용자의 확대를 막는 건 접근성 위반"이라는 것이다.
그런데 여기에는 재미있는 반전이 있다. 일반 iOS Safari는 iOS 10부터 `user-scalable=no`를
의도적으로 무시한다. 바로 그 접근성 문제 때문에 애플이 브라우저에서는 이 지시를 안 듣기로 한 것이다.
반면 WKWebView는 기본 설정에서 이 값을 그대로 존중한다.

결과적으로 같은 메타 태그 하나로, 브라우저로 접속한 사용자는 핀치 줌이 계속 되고(접근성 유지),
앱 웹뷰에서만 네이티브 앱처럼 줌이 잠긴다. 앱 래핑 시나리오에 정확히 들어맞는 분기가
플랫폼 차원에서 공짜로 생기는 셈이다.

한 가지 유의할 것은 네이티브 래퍼 쪽 설정이다. WKWebView에 `ignoresViewportScaleLimits = true`를
켜 두면 메타 태그의 스케일 제한이 무시된다. 이번 수정 후에도 앱에서 줌이 되면 웹이 아니라
래퍼 코드를 봐야 한다. Android WebView도 메타의 `user-scalable=no`를 따르므로 같은 수정으로 커버된다.

## 검증

dev 서버를 띄우고 렌더된 메타 태그를 확인했다.

```
width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover
```

Next의 `Viewport` 객체가 의도한 문자열로 직렬화되는 것까지 확인했다. 핀치 동작 자체는
브라우저 패널이나 시뮬레이터 Safari로는 검증이 안 된다. Safari는 위에서 말한 대로
`user-scalable=no`를 무시해서 핀치가 계속 되는 게 정상이고, 진짜 검증 무대는 WKWebView 래퍼 앱이라
실기기 앱 빌드에서 확인해야 한다. 포커스 자동 확대 쪽은 `maximum-scale=1`이 Safari에서도
존중되는 값이라 시뮬레이터 Safari에서도 재현이 사라지는 것을 볼 수 있다.

lint, check-types, format:check 모두 통과했다.

## 남은 것

- 래퍼 앱 재빌드 후 실기기에서 두 증상이 사라졌는지 확인
- Android WebView 쪽도 같은 시나리오 테스트
