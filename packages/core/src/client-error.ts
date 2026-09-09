/**
 * @file 브라우저 에러 경계 → 서버 보고 (KAN-457).
 *
 * 에러바운더리가 잡은 에러는 브라우저 안에서 끝난다. 서버는 그런 일이 있었는지조차
 * 모르니 프로메테우스에도 없다. 경계가 이 함수를 불러 같은 origin의 보고 라우트로
 * 한 줄 POST하면, 라우트 핸들러(`client-error-handler.ts`)가 카운터를 올린다.
 *
 * 브라우저·서버 양쪽 번들에 들어가므로 Node 전용 import는 두지 않는다.
 */

/** 보고 라우트 경로. 각 앱의 `app/api/client-error/route.ts`가 받는다. */
export const CLIENT_ERROR_REPORT_PATH = "/api/client-error";

/** 보고 본문. 값은 라벨로 쓰이니 메시지·스택처럼 무한히 다양한 건 싣지 않는다. */
export interface ClientErrorReport {
  /** 에러를 잡은 경계 이름 */
  boundary: string;
  /** 에러 이름 (`TypeError`, `ApiError:404`) */
  error: string;
}

/** 라벨 값으로 허용하는 형태. 벗어나면 핸들러가 `other`로 접는다. */
export const LABEL_VALUE_PATTERN = /^[A-Za-z][A-Za-z0-9_:.-]{0,39}$/;

/**
 * 에러 객체에서 라벨용 이름을 뽑는다.
 *
 * `constructor.name`이 아니라 `name`이다. prod 번들은 클래스 이름을 민지해서
 * 생성자 이름이 `t`, `n` 따위로 바뀐다. `name`은 내장 에러가 스스로 채우고,
 * 우리 커스텀 에러(`ApiError`)도 생성자에서 명시한다.
 *
 * ApiError는 HTTP status를 붙인다. 404와 500은 원인이 다른데 이름만으로는
 * 구분이 안 되고, status는 값의 가짓수가 한 자리 수라 카디널리티 걱정이 없다.
 *
 * @example errorName(new TypeError("x")) → "TypeError"
 * @example errorName(new ApiError(404, "ARTICLE_NOT_FOUND", "…")) → "ApiError:404"
 */
export function errorName(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as { status?: unknown }).status;
    if (error.name === "ApiError" && typeof status === "number") {
      return `ApiError:${status}`;
    }
    return error.name || "Error";
  }
  return "NonError";
}

/**
 * 경계가 잡은 에러를 서버에 보고한다. 실패해도 조용히 넘어간다. 보고 때문에
 * 에러 화면이 또 깨지면 본말전도다.
 *
 * `sendBeacon`을 먼저 쓴다. 페이지가 곧 닫히거나 이동해도(라우트 error.tsx에서
 * 뒤로 가기 등) 브라우저가 전송을 책임진다. 없으면 `keepalive` fetch로 같은
 * 효과를 낸다. 둘 다 same-origin이라 CORS나 토큰이 필요 없고, `/api` 경로라
 * 각 앱 `proxy.ts`의 토큰 갱신도 타지 않는다.
 *
 * @param boundary 경계 이름. 컴포넌트 경계는 그 이름, 라우트 error.tsx는 `route`
 * @param error 경계가 받은 에러
 */
export function reportClientError(boundary: string, error: unknown): void {
  if (typeof window === "undefined") return;
  const report: ClientErrorReport = { boundary, error: errorName(error) };
  const body = JSON.stringify(report);
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(CLIENT_ERROR_REPORT_PATH, blob)) return;
    }
    void fetch(CLIENT_ERROR_REPORT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // 보고는 최선 노력이다. 여기서 던지면 경계 fallback 렌더가 깨진다
  }
}
