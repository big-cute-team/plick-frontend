/**
 * @file 링크 공유 유틸 (KAN-312) — 공유할 주소 조립과 클립보드 복사.
 */

/**
 * 공유할 기사 세부 페이지 주소.
 *
 * 릴스에서 눌러도 같은 주소를 만든다 — 릴과 기사가 같은 `articleSummaryId`
 * 체계라(KAN-310 조회 기록이 같은 이유) 릴 id를 그대로 기사 경로에 붙이면 된다.
 * 릴스는 커서 피드라 특정 릴을 가리키는 주소 자체가 없기도 하다.
 *
 * 도메인을 env로 박지 않고 `location.origin`을 쓴다. 이 앱은 배포된 URL을
 * 웹뷰로 감싸 스토어에 올릴 예정이라(티켓 3번), 웹뷰가 띄운 origin이 곧 공유
 * 대상 origin이다. env로 박으면 로컬·프리뷰에서 배포 도메인이 복사돼 딴 데로 샌다.
 *
 * ⚠️ `location`을 읽으므로 브라우저에서만 부른다(마운트 뒤 이벤트 핸들러나 effect).
 *
 * @param articleId 기사(=릴) id
 */
export function articleShareUrl(articleId: string): string {
  return `${window.location.origin}/articles/${articleId}`;
}

/**
 * 텍스트를 기기 클립보드에 넣는다. 성공 여부를 돌려준다.
 *
 * 먼저 표준 `navigator.clipboard`를 쓰고, 없거나 거절당하면 옛 방식으로 폴백한다.
 * 폴백이 필요한 이유는 웹뷰다 — Clipboard API는 보안 컨텍스트(https 또는
 * localhost)에서만 존재하고, 안드로이드 WebView는 그마저도 호스트 앱이
 * 권한을 열어 줘야 동작한다. 그 자리에서 API가 통째로 없거나 promise가
 * reject되는데, `document.execCommand("copy")`는 같은 웹뷰에서도 대개 살아 있다.
 *
 * 둘 다 실패하면 false다. 부르는 쪽이 "길게 눌러 복사" 안내로 떨어뜨린다 —
 * 화면에 주소 원문을 늘 보여 주는 이유이기도 하다.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 권한 거부·비보안 컨텍스트 — 아래 폴백으로 내려간다 */
  }
  return copyBySelection(text);
}

/**
 * `execCommand` 폴백 — 화면 밖 textarea에 값을 넣고 선택한 뒤 복사 명령을 날린다.
 *
 * iOS WKWebView는 `select()`만으로는 선택이 잡히지 않아 복사가 조용히 실패한다.
 * `contentEditable`을 켜고 Range로 직접 선택 범위를 만들어야 먹는다.
 * textarea는 `opacity: 0`에 `position: fixed`라 깜빡임도, 스크롤 점프도 없다.
 */
function copyBySelection(text: string): boolean {
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

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  selection?.removeAllRanges();
  field.remove();
  return copied;
}
