import { handleClientErrorReport } from "@plick/core/client-error-handler";

/**
 * 브라우저 에러 경계 보고 수신 (KAN-457). 경계가 `reportClientError`로 보낸
 * `{ boundary, error }`를 받아 `plick_client_error_total` 카운터를 올린다.
 * 본문 검증과 카운트는 `@plick/core`가 하고, 여기는 Next 라우트 규약만 채운다.
 *
 * `proxy.ts`의 matcher가 `api`를 제외하므로 토큰 갱신 미들웨어를 타지 않는다.
 * 메트릭 핸들은 Node 런타임의 `instrumentation.ts`가 전역에 걸어 둔 것이라
 * 이 라우트도 Node로 고정한다.
 */
export const runtime = "nodejs";

export const POST = handleClientErrorReport;
