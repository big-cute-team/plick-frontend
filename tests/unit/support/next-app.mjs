/**
 * @file 앱 라우트·프록시를 node에서 직접 돌리는 테스트 공용 도구 (KAN-675).
 *
 * 두 앱의 `route.ts`·`proxy.ts`는 주석만 다르고 코드가 같다. 테스트는 앱 목록을 돌며 같은 케이스를
 * 양쪽 파일에 건다. BE 호출(`issueGuest`, `refreshTokensShared`)은 모두 `apiFetch`의 전역 `fetch`를
 * 지나므로 모듈을 갈아끼우지 않고 `fetch`만 가짜로 바꾼다.
 */

/** 두 앱 이름과 앱마다 다른 값 */
export const APPS = [
  { name: "mobile", host: "m.plick.co.kr", client: "mobile_web" },
  { name: "web", host: "plick.co.kr", client: "desktop_web" },
];

/** 사람 브라우저 UA (아이폰 사파리) */
export const HUMAN_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/** 크롤러 UA */
export const CRAWLER_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/** `apiFetch`가 서버에서 부르는 BE 주소 (`API_BASE_URL` 기본값) */
export const BE_BASE = process.env.API_BASE_URL ?? "http://localhost:8080";

/**
 * 앱 하나의 게스트 라우트, 프록시, 상수, 그 앱의 `next/server`를 불러온다. `next`는 루트에서
 * 해석되지 않아(pnpm이 앱 아래에만 링크한다) 앱 폴더의 것을 직접 가리킨다.
 *
 * @param name `mobile` 또는 `web`
 */
export async function loadApp(name) {
  const root = new URL(`../../../apps/${name}/`, import.meta.url);
  const [route, proxy, constants, server] = await Promise.all([
    import(new URL("app/api/session/guest/route.ts", root).href),
    import(new URL("proxy.ts", root).href),
    import(new URL("app/_constants/api.ts", root).href),
    import(new URL("node_modules/next/server.js", root).href),
  ]);
  /**
   * 테스트용 요청. 쿠키는 객체로 받아 `cookie` 헤더로 조립한다.
   *
   * @param url 절대 URL
   * @param init 메서드, 헤더, 쿠키
   */
  function makeRequest(
    url,
    { method = "GET", headers = {}, cookies = {} } = {},
  ) {
    const cookie = Object.entries(cookies)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("; ");
    return new server.NextRequest(url, {
      method,
      headers: {
        "user-agent": HUMAN_UA,
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
    });
  }
  return { POST: route.POST, proxy: proxy.proxy, constants, makeRequest };
}

/**
 * 전역 `fetch`를 가짜로 바꾼다. 부른 기록을 남기고, 응답은 `handler`가 정한다.
 *
 * @param handler `(path, init) => Response | Promise<Response>`. path는 BE 주소를 뗀 경로
 * @returns 호출 기록과 되돌리기 함수
 */
export function stubFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const path = url.startsWith(BE_BASE) ? url.slice(BE_BASE.length) : url;
    calls.push({ path, init, headers: new Headers(init?.headers) });
    return handler(path, init);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

/**
 * BE 성공 봉투 응답
 *
 * @param data 봉투의 `data`
 */
export function beOk(data) {
  return Response.json({ code: "SUCCESS", message: null, data });
}

/**
 * BE 에러 봉투 응답
 *
 * @param status HTTP status
 * @param code BE 에러 코드
 */
export function beError(status, code) {
  return Response.json({ code, message: code, data: null }, { status });
}

/**
 * 응답의 `Set-Cookie`를 이름별로 푼다. 지우는 쿠키는 `deleted: true`다.
 *
 * @param response 라우트·프록시 응답
 */
export function setCookies(response) {
  const result = {};
  for (const line of response.headers.getSetCookie()) {
    const [pair, ...attrs] = line.split(";").map((s) => s.trim());
    const at = pair.indexOf("=");
    const name = pair.slice(0, at);
    const value = decodeURIComponent(pair.slice(at + 1));
    const lower = attrs.map((a) => a.toLowerCase());
    result[name] = {
      value,
      httpOnly: lower.includes("httponly"),
      deleted:
        value === "" &&
        lower.some(
          (a) => a === "max-age=0" || a.startsWith("expires=thu, 01 jan 1970"),
        ),
    };
  }
  return result;
}
