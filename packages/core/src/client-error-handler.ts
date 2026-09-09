/**
 * @file 클라 에러 보고 라우트 핸들러 (KAN-457). 각 앱의
 * `app/api/client-error/route.ts`가 `POST`로 그대로 내보낸다.
 *
 * 인증이 없는 공개 엔드포인트다. 누구든 아무 값이나 보낼 수 있으니 본문을 믿지
 * 않는다. 형태가 어긋나면 `other`로 접고, 라벨 가짓수 상한은 `metrics.ts`가 건다.
 * 응답은 항상 204다. 잘못된 요청에 400을 줘 봐야 sendBeacon은 응답을 안 읽는다.
 */

import { LABEL_VALUE_PATTERN } from "./client-error";
import { getMetricsHandle } from "./metrics-handle";

/** 본문 상한. 정상 보고는 100바이트 안쪽이라 이보다 크면 보고가 아니다. */
const MAX_BODY_BYTES = 1024;

/** 라벨 값 정리. 문자열이 아니거나 허용 형태 밖이면 `other`. */
function toLabel(value: unknown): string {
  return typeof value === "string" && LABEL_VALUE_PATTERN.test(value)
    ? value
    : "other";
}

/**
 * 보고 한 건을 받아 `plick_client_error_total`을 올린다.
 *
 * @param request `{ boundary, error }` JSON 본문의 POST
 */
export async function handleClientErrorReport(
  request: Request,
): Promise<Response> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const report = (body ?? {}) as Record<string, unknown>;
  getMetricsHandle()?.recordClientError(
    toLabel(report.boundary),
    toLabel(report.error),
  );
  return new Response(null, { status: 204 });
}
