import type { Locator, Page } from "@playwright/test";

/**
 * 낙관적 갱신이 늦게 온 조회 응답에 덮이지 않는지 보는 도구 (KAN-748).
 *
 * 경합을 운에 맡기지 않는다. 늦출 응답은 BE에서 먼저 받아 두고(누르기 전 상태가 담긴다),
 * 테스트가 누른 다음에 브라우저로 돌려준다. 누르는 서버 액션은 붙잡아 BE에 보내지 않으므로
 * dev DB에 아무것도 남지 않는다. 시나리오 규칙의 "읽기와 이동만"을 지키면서 쓰기 화면을 본다.
 */

/**
 * 페이지를 다시 열고, 다시 연 화면이 처음 보낸 요청의 응답을 받아 두었다가 `ms` 뒤에 돌려준다.
 *
 * 다시 열기 전 화면이 보낸 같은 주소의 요청은 그냥 보낸다. 먼저 붙잡기를 걸어 두면 지금 화면의
 * 조회가 걸려, 다시 연 화면의 조회를 받아 두기도 전에 "받아 뒀다"가 풀린다(실제로 그렇게 깨졌다).
 * 그래서 새 문서가 들어오기 시작한 뒤(`commit`)부터만 붙잡는다. 새 화면의 조회는 스크립트가 뜬
 * 뒤에야 나가므로 그 사이에 놓치지 않는다.
 *
 * @param page 대상 페이지
 * @param url 늦출 요청
 * @param ms 붙잡아 둘 시간
 * @returns `fetched`는 BE 응답을 받아 둔 순간, `released`는 브라우저에 돌려준 순간에 풀린다
 */
export async function reloadHolding(
  page: Page,
  url: string | RegExp,
  ms = 1_500,
): Promise<{ fetched: Promise<void>; released: Promise<void> }> {
  let markFetched = () => {};
  let markReleased = () => {};
  const fetched = new Promise<void>((resolve) => (markFetched = resolve));
  const released = new Promise<void>((resolve) => (markReleased = resolve));
  let armed = false;
  let held = false;

  await page.route(url, async (route) => {
    if (!armed || held) return route.fallback();
    held = true;
    const response = await route.fetch();
    markFetched();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.fulfill({ response });
    markReleased();
  });
  await page.reload({ waitUntil: "commit" });
  armed = true;
  return { fetched, released };
}

/**
 * 요청을 `open`을 부를 때까지 보내지 않는다. 그동안 서버에는 그 요청이 없던 것과 같다.
 *
 * @param page 대상 페이지
 * @param url 붙잡을 요청
 * @returns 붙잡은 요청을 보내는 함수
 */
export async function gateRequest(
  page: Page,
  url: string | RegExp,
): Promise<() => void> {
  let open = () => {};
  const gate = new Promise<void>((resolve) => (open = resolve));
  await page.route(url, async (route) => {
    await gate;
    await route.fallback();
  });
  return open;
}

/**
 * 앱 스크립트를 `release`를 부를 때까지 받지 못하게 한다 (KAN-750). 그동안 화면은 서버가 보낸
 * HTML만 그려져 있고 버튼에는 클릭 처리기가 없다. 하이드레이션 전에 누른 클릭이 살아남는지 볼 때 쓴다.
 *
 * @param page 대상 페이지
 * @returns 붙잡은 스크립트를 풀어 주는 함수
 */
export function holdAppScripts(page: Page): Promise<() => void> {
  return gateRequest(page, /\/_next\/static\/.+\.js(\?|$)/);
}

/** 버튼에 React가 붙었는가(하이드레이션됐는가). React가 DOM 노드에 다는 속성으로 본다 */
export function isHydrated(button: Locator): Promise<boolean> {
  return button.evaluate((el) =>
    Object.keys(el).some((key) => key.startsWith("__reactProps")),
  );
}

/**
 * 이 화면의 서버 액션(POST + `next-action` 헤더)을 붙잡아 BE에 닿지 않게 한다. 응답을 주지
 * 않아 뮤테이션은 진행 중으로 남고, 화면은 낙관적 값을 그린 채로 있다.
 *
 * @param page 대상 페이지
 */
export async function holdServerActions(page: Page): Promise<void> {
  await page.route(/\/(articles|reels)\/\d+$/, (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      return;
    }
    return route.fallback();
  });
}

/**
 * 버튼의 `aria-pressed`가 바뀔 때마다 적는다. "찼다가 잠깐 빠졌다"처럼 끝 상태만 봐서는
 * 안 보이는 깜빡임을 잡으려는 것이다.
 *
 * @param button 지켜볼 버튼
 * @returns 지금까지의 값 목록을 돌려주는 함수. 첫 항목은 지켜보기 시작할 때의 값이다
 */
export async function recordPressed(
  button: Locator,
): Promise<() => Promise<string[]>> {
  await button.evaluate((el) => {
    const history = [el.getAttribute("aria-pressed") ?? ""];
    new MutationObserver(() => {
      history.push(el.getAttribute("aria-pressed") ?? "");
    }).observe(el, { attributes: true, attributeFilter: ["aria-pressed"] });
    (el as HTMLElement & { pressedHistory?: string[] }).pressedHistory =
      history;
  });
  return () =>
    button.evaluate(
      (el) =>
        (el as HTMLElement & { pressedHistory?: string[] }).pressedHistory ??
        [],
    );
}

/**
 * 요소의 글자가 바뀔 때마다 적는다. 좋아요 수가 올랐다가 잠깐 내려가는 흔들림을 잡는다.
 *
 * @param element 지켜볼 요소
 * @returns 지금까지의 글자 목록을 돌려주는 함수. 첫 항목은 지켜보기 시작할 때의 글자다
 */
export async function recordText(
  element: Locator,
): Promise<() => Promise<string[]>> {
  await element.evaluate((el) => {
    const read = () => (el.textContent ?? "").trim();
    const history = [read()];
    new MutationObserver(() => {
      const now = read();
      if (now !== history[history.length - 1]) history.push(now);
    }).observe(el, { childList: true, characterData: true, subtree: true });
    (el as HTMLElement & { textHistory?: string[] }).textHistory = history;
  });
  return () =>
    element.evaluate(
      (el) =>
        (el as HTMLElement & { textHistory?: string[] }).textHistory ?? [],
    );
}

/** 게스트 세션이 생겼는가. 표식 쿠키로 본다 */
export async function hasSession(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((cookie) => cookie.name === "sessionKind");
}
