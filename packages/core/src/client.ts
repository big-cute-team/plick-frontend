/**
 * @file BE fetch 얇은 래퍼 — base 선택·JSON 파싱·봉투 해제·에러 정규화만.
 * 도메인 변환은 각 앱의 fetcher(login 등)에서 한다. 모바일 `_apis/client.ts`로 살다
 * web이 두 번째 사용처가 되면서 승격했다(KAN-318, ADR 0011 게이트 C).
 *
 * 토큰은 여기서 찾지 않는다. 서버에서 부를 때는 호출부가 쿠키를 읽어
 * `Authorization` 헤더로 넘기고, 브라우저에서 부를 때는 HttpOnly 쿠키를 못 읽어
 * 넘길 수가 없어서 각 앱 `proxy.ts`가 `/be` 프록시 요청에 실어 준다(KAN-308).
 *
 * 분석 헤더 넷(`X-Plick-*`, `analytics.ts`)도 호출부가 붙이지 않는다. 브라우저 fetch는
 * 프록시가 붙이고, 서버 측 fetch는 각 앱이 `setApiFetchHeaderProvider`로 꽂아 둔 제공자가
 * 요청 헤더에서 옮겨 싣는다(KAN-542). 호출부가 같은 이름을 직접 넘기면 그쪽이 우선이다.
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
    /** 에러 봉투의 `data` — 대부분 null이지만 `AUTH_REJOIN_RESTRICTED`의 `rejoinableAt`처럼 부가 정보를 실어 온다 (KAN-393). */
    public data: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 소셜 계정이 있어야 되는 일을 막힌 것인가 (KAN-514).
 *
 * 댓글·신고·채팅은 소셜 사용자 전용이라 두 가지로 막힌다(댓글 좋아요는 KAN-527부터
 * 게스트도 된다). 세션이 아예
 * 없으면 401 `AUTH_REQUIRED`, 게스트 세션이면 403 `AUTH_GUEST_FORBIDDEN`이다. 화면이
 * 할 일은 둘 다 같다 — 연동/로그인 유도 팝업을 띄운다. 그래서 호출부마다 code 두 개를
 * 늘어놓지 않게 여기서 묶는다. 어느 문구를 띄울지는 팝업이 `isGuest`로 정한다.
 *
 * 다른 401(토큰 만료 등)과 섞이지 않게 status가 아니라 code로 본다.
 */
export function needsSocialAccount(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "AUTH_REQUIRED" || error.code === "AUTH_GUEST_FORBIDDEN")
  );
}

/**
 * BE가 참여 쓰기 상한에 걸려 잠시 거절한 것인가 (KAN-527, BE KAN-526).
 *
 * 좋아요·댓글 좋아요(`POST`·`DELETE …/like`)는 DB가 느린 순간 같은 대상에 버스트가
 * 몰리면 503 `COMMON_SERVICE_BUSY`로 떨어진다. 서버가 죽은 게 아니라 순간 상한이라
 * 잠깐 뒤 한 번 더 보내면 대개 붙는다. 인증 문제가 아니므로 로그인 화면으로 보내면
 * 안 되고, 낙관적으로 올린 카운트는 재시도까지 실패했을 때만 되돌린다.
 */
export function isServiceBusy(error: unknown): boolean {
  return error instanceof ApiError && error.code === "COMMON_SERVICE_BUSY";
}

/**
 * 바쁨(503) 뒤 한 번 자동 재시도하기까지 기다리는 시간(ms). BE가 카운트 증감을
 * 1초마다 모아 반영하고 재시도도 그쯤 뒤를 권한다(KAN-526).
 */
export const SERVICE_BUSY_RETRY_DELAY_MS = 1000;

/**
 * `apiFetch` 한 번의 결과 요약. 메트릭 관측자가 받는다 (KAN-455).
 *
 * `path`는 호출부가 넘긴 원문 그대로다. ID를 접어 라벨 카디널리티를 낮추는 일은
 * 관측자 쪽(`metrics.ts`)에서 한다.
 */
export interface ApiFetchOutcome {
  method: string;
  path: string;
  /** HTTP status. 네트워크 단계에서 실패해 응답이 없으면 0. */
  status: number;
  durationMs: number;
}

/**
 * `apiFetch` 결과를 받아 볼 관측자. 서버 프로세스가 `setApiFetchObserver`로 꽂는다.
 *
 * 이 파일은 브라우저 번들에도 들어가므로 prom-client 같은 Node 전용 의존을
 * 여기서 import하지 않는다. 관측자를 함수 한 개짜리 빈 슬롯으로 두고, 서버가
 * 뜰 때(`instrumentation.ts`)만 채운다. 브라우저에선 영원히 null이라 비용이 없다.
 */
type ApiFetchObserver = (outcome: ApiFetchOutcome) => void;

/**
 * 관측자를 모듈 변수가 아니라 `globalThis`에 둔다.
 *
 * Next는 `instrumentation.ts`와 각 페이지·라우트를 서로 다른 번들로 묶고, 번들마다
 * 이 파일의 복사본이 따로 들어간다. 모듈 변수로 두면 instrumentation 번들의 슬롯에만
 * 관측자가 꽂히고 페이지 번들의 `apiFetch`는 빈 슬롯을 본다(첫 검증에서 실제로
 * 카운터가 0으로 남았다). 프로세스 전체가 공유하는 자리는 `globalThis`뿐이라
 * `Symbol.for`로 키를 만들어 거기 둔다.
 */
const OBSERVER_KEY = Symbol.for("plick.apiFetchObserver");

function getObserver(): ApiFetchObserver | null {
  return (
    (globalThis as Record<symbol, ApiFetchObserver | null | undefined>)[
      OBSERVER_KEY
    ] ?? null
  );
}

/**
 * BE 호출 관측자를 등록한다. 마지막에 등록한 하나만 유지한다.
 *
 * @param observer 호출마다 받을 콜백. null이면 해제.
 */
export function setApiFetchObserver(observer: ApiFetchObserver | null): void {
  (globalThis as Record<symbol, ApiFetchObserver | null>)[OBSERVER_KEY] =
    observer;
}

/** 관측자가 던져도 호출부 흐름을 깨지 않게 감싼다. 메트릭은 부수 효과일 뿐이다. */
function observe(outcome: ApiFetchOutcome): void {
  const observer = getObserver();
  if (!observer) return;
  try {
    observer(outcome);
  } catch {
    /* 메트릭 실패는 무시 */
  }
}

/**
 * 서버 측 `apiFetch`에 실을 헤더를 돌려주는 제공자 (KAN-542). 각 앱이 `instrumentation.ts`에서
 * 꽂는다. 분석 헤더 넷처럼 "모든 요청에 같이 나가야 하지만 호출부는 모르는" 값이 대상이다.
 *
 * 관측자와 같은 이유로 `globalThis`에 둔다 - 번들마다 이 파일의 복사본이 따로 들어가
 * 모듈 변수는 instrumentation 번들에만 꽂힌다. 브라우저에서는 영원히 비어 있고, 이 파일은
 * Next에 의존하지 않으므로 요청 컨텍스트(`headers()`)를 읽는 일은 제공자 쪽 몫이다.
 */
type ApiFetchHeaderProvider = () => Promise<Record<string, string>>;

const HEADER_PROVIDER_KEY = Symbol.for("plick.apiFetchHeaderProvider");

function getHeaderProvider(): ApiFetchHeaderProvider | null {
  return (
    (globalThis as Record<symbol, ApiFetchHeaderProvider | null | undefined>)[
      HEADER_PROVIDER_KEY
    ] ?? null
  );
}

/**
 * 서버 측 `apiFetch`가 매 호출 전에 물어볼 헤더 제공자를 등록한다. 마지막 하나만 유지한다.
 *
 * @param provider 호출마다 실을 헤더 이름과 값. null이면 해제
 */
export function setApiFetchHeaderProvider(
  provider: ApiFetchHeaderProvider | null,
): void {
  (globalThis as Record<symbol, ApiFetchHeaderProvider | null>)[
    HEADER_PROVIDER_KEY
  ] = provider;
}

/**
 * 제공자가 준 헤더를 호출부가 안 넘긴 이름에만 채운다. 제공자가 던지면 빈 것으로 본다 -
 * 분석 값 때문에 서비스 요청이 실패하는 일은 없어야 한다(BE 계약과 같은 원칙).
 */
async function applyProvidedHeaders(headers: Headers): Promise<void> {
  const provider = getHeaderProvider();
  if (!provider) return;
  let provided: Record<string, string>;
  try {
    provided = await provider();
  } catch {
    return;
  }
  for (const [name, value] of Object.entries(provided)) {
    if (!headers.has(name)) headers.set(name, value);
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
  /* 서버에서만. 브라우저 fetch는 프록시가 `/be` 요청에 붙인다(KAN-542) */
  if (typeof window === "undefined") {
    await applyProvidedHeaders(headers);
  }

  const authorized = headers.has("Authorization");
  const isGet = (init?.method ?? "GET").toUpperCase() === "GET";
  const cacheConfigured = init?.cache !== undefined || init?.next !== undefined;
  const cacheable = !authorized && isGet && !cacheConfigured;

  const method = (init?.method ?? "GET").toUpperCase();
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers,
      ...(authorized ? { cache: "no-store" as const } : {}),
      ...(cacheable ? { next: { revalidate: ANONYMOUS_GET_REVALIDATE } } : {}),
    });
  } catch (error) {
    observe({ method, path, status: 0, durationMs: Date.now() - startedAt });
    throw error;
  }
  observe({
    method,
    path,
    status: res.status,
    durationMs: Date.now() - startedAt,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Partial<
      ApiEnvelope<unknown>
    > | null;
    throw new ApiError(
      res.status,
      body?.code ?? String(res.status),
      body?.message ?? `${res.status} ${path}`,
      body?.data ?? null,
    );
  }

  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}
