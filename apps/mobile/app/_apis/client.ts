/**
 * @file BE fetch 얇은 래퍼. base 선택·JSON 파싱·봉투 해제·에러 정규화·(미래) 토큰 주입만.
 * 도메인 변환은 각 fetcher(login 등)에서 한다.
 */

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

/** 서버에선 절대 URL. 클라 fetch가 처음 생기면 same-origin 프록시(/be) 분기를 추가한다. */
function baseUrl(): string {
  return process.env.API_BASE_URL ?? "http://localhost:8080";
}

/**
 * BE 엔드포인트를 호출하고 봉투를 벗긴 `data`를 반환한다.
 *
 * @param path `/api/v1/auth/login` 처럼 앞에 슬래시를 포함한 경로
 * @throws {ApiError} status가 2xx가 아닐 때 — BE 에러 봉투의 code·message를 담는다
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      // 인증 주입 지점 — 보호 API가 생기면 여기서 쿠키의 accessToken을 Bearer로 싣는다
    },
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
