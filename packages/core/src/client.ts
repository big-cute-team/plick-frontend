/**
 * @file BE fetch 얇은 래퍼 — base 선택·JSON 파싱·봉투 해제·에러 정규화만.
 * 도메인 변환은 각 앱의 fetcher(login 등)에서 한다. 모바일 `_apis/client.ts`로 살다
 * web이 두 번째 사용처가 되면서 승격했다(KAN-318, ADR 0011 게이트 C).
 *
 * 토큰은 여기서 찾지 않는다. 서버에서 부를 때는 호출부가 쿠키를 읽어
 * `Authorization` 헤더로 넘기고, 브라우저에서 부를 때는 HttpOnly 쿠키를 못 읽어
 * 넘길 수가 없어서 각 앱 `proxy.ts`가 `/be` 프록시 요청에 실어 준다(KAN-308).
 */

/**
 * 브라우저 fetch가 쓰는 same-origin BE 프록시 경로 (KAN-271).
 *
 * 각 앱 `next.config.js`의 rewrites가 이 접두어를 떼고 BE로 넘긴다. `apiFetch`가
 * base로 쓰고, 각 앱 `proxy.ts`가 이 경로의 요청에만 Bearer 토큰을 실어 준다(KAN-308).
 */
export const BE_PROXY_PREFIX = "/be";

/**
 * BE 공통 응답 봉투 — 모든 엔드포인트가 `{ code, message, data }`로 감싸 온다
 * (스웨거 `ApiResponse*` 스키마). 성공 시 `code: "OK"`.
 */
interface ApiEnvelope<T> {
  code: string;
  message: string | null;
  data: T;
}

/** BE가 정상 범위 밖 status를 줄 때 던지는 에러 (호출부가 잡아 에러 UI로). */
export class ApiError extends Error {
  constructor(
    public status: number,
    /** BE 에러 코드 (예: `COMMON_INVALID_PARAM`). 응답 파싱 실패 시 HTTP status 문자열. */
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 서버에선 절대 URL, 브라우저에선 same-origin 프록시(`/be`)를 쓴다.
 *
 * 브라우저에서 BE 오리진을 직접 부르면 CORS에 막히고 base URL도 클라 번들에
 * 노출된다. 각 앱 `next.config.js`의 rewrites가 `/be/*`를 BE로 넘겨주므로
 * 브라우저는 자기 오리진만 부르면 된다 (KAN-271).
 */
function baseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_BASE_URL ?? "http://localhost:8080";
  }
  return BE_PROXY_PREFIX;
}

/**
 * Next가 `RequestInit`에 얹는 데이터 캐시 옵션. `@plick/core`는 Next에 의존하지
 * 않는 순수 패키지라 전역 타입 보강을 받지 못해 여기서 좁게 선언한다.
 * 브라우저 fetch에서는 알 수 없는 속성이라 그냥 무시된다.
 */
type NextRequestInit = RequestInit & {
  next?: { revalidate?: number | false };
};

/**
 * 익명 GET의 서버 데이터 캐시 수명(초) (KAN-380).
 *
 * 크롤러 응답 속도를 좌우하는 건 페이지 함수 실행이 아니라 BE 왕복이다. 60초면
 * 이적 루머 피드의 신선도는 사실상 그대로면서, 크롤러가 기사를 연달아 훑을 때
 * 같은 목록 호출이 반복되는 몫을 걷어낸다.
 */
const ANONYMOUS_GET_REVALIDATE = 60;

/**
 * BE 엔드포인트를 호출하고 봉투를 벗긴 `data`를 반환한다.
 *
 * 토큰을 실은 호출은 서버 데이터 캐시에 넣지 않는다(KAN-308). Next의 데이터 캐시는
 * 유저 구분 없이 URL 단위로 공유돼서, 한 번 캐시되면 같은 주소를 부른 다른 사람에게
 * 그대로 나간다 — 좋아요 여부(`likedByMe`)처럼 사람마다 다른 값이 섞이면 남의 상태를
 * 보게 된다. 기본 캐시 동작에 기대지 않고 인증 호출은 여기서 못박는다.
 *
 * 반대로 토큰 없는 GET은 유저 무관이라 캐시에 넣는다 (KAN-380). Next 15부터 fetch
 * 기본값이 no-store라 명시하지 않으면 익명 조회도 매번 BE를 돈다. 크롤러는 항상
 * 익명이므로 이 분기만으로 크롤 경로가 빨라지고, 로그인 유저 경로는 위 no-store
 * 그대로다. 호출부가 `cache`나 `next`를 직접 넘겼으면 그 뜻을 존중해 손대지 않는다 —
 * 겹쳐 넘기면 Next가 충돌로 보고 둘 다 무시한다.
 *
 * @param path `/api/v1/auth/login` 처럼 앞에 슬래시를 포함한 경로
 * @throws {ApiError} status가 2xx가 아닐 때 — BE 에러 봉투의 code·message를 담는다
 */
export async function apiFetch<T>(
  path: string,
  init?: NextRequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const authorized = headers.has("Authorization");
  const isGet = (init?.method ?? "GET").toUpperCase() === "GET";
  const cacheConfigured = init?.cache !== undefined || init?.next !== undefined;
  const cacheable = !authorized && isGet && !cacheConfigured;

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
    ...(authorized ? { cache: "no-store" as const } : {}),
    ...(cacheable ? { next: { revalidate: ANONYMOUS_GET_REVALIDATE } } : {}),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Partial<
      ApiEnvelope<unknown>
    > | null;
    throw new ApiError(
      res.status,
      body?.code ?? String(res.status),
      body?.message ?? `${res.status} ${path}`,
    );
  }

  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}
