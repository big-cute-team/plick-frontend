/**
 * @file 프로메테우스 메트릭 서버 (KAN-455). Next와 별도 포트에 `/metrics`를 연다.
 *
 * 왜 별도 포트인가: Next 라우트로 만들면 ALB를 거쳐 인터넷에서도 보인다. 요청 수와
 * 에러율은 남에게 보여 줄 값이 아니다. 별도 포트는 ALB 대상 그룹에 안 넣으니
 * 바깥에서 닿을 길이 없고, 보안그룹에서 모니터링 EC2에만 열어 주면 된다.
 *
 * 왜 `@plick/core`인가: web과 mobile이 같은 인스턴스에서 같은 방식으로 뜬다.
 * 이 파일은 Node 전용(`node:http`, prom-client)이라 브라우저 번들에 들어가면 안 된다.
 * 각 앱 `instrumentation.ts`가 Node 런타임에서만 동적 import한다.
 */

import { createServer } from "node:http";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
import { setApiFetchObserver, type ApiFetchOutcome } from "./client";
import { setMetricsHandle, type MetricsHandle } from "./metrics-handle";

export type { MetricsHandle } from "./metrics-handle";

/** `startMetricsServer` 옵션. */
export interface MetricsServerOptions {
  /** 라벨 `app`에 들어갈 앱 이름 (`mobile`·`web`). */
  app: string;
  /** `/metrics`를 열 포트. */
  port: number;
}

/**
 * 클라 에러 라벨 하나가 가질 수 있는 서로 다른 값의 상한 (KAN-457).
 *
 * 보고 엔드포인트는 인증이 없어 누구나 아무 문자열을 보낼 수 있다. 형태 검사만으로는
 * 값의 가짓수를 못 막는다. 처음 본 값 N개까지만 그대로 쓰고 그 뒤는 전부 `other`로
 * 접는다. 진짜 경계 이름은 열 몇 개라 이 상한에 닿을 일이 없다.
 */
const MAX_CLIENT_ERROR_LABEL_VALUES = 32;

/**
 * 경로의 ID 세그먼트를 접는다. 숫자·UUID·긴 해시를 `:id`로 바꿔 라벨 카디널리티를
 * 막는다. 라벨 값이 무한히 늘면 프로메테우스 메모리가 그만큼 는다.
 *
 * @example normalizePath("/api/v1/articles/123/comments?cursor=9") → "/api/v1/articles/:id/comments"
 */
export function normalizePath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? path;
  return withoutQuery
    .split("/")
    .map((seg) => {
      if (/^\d+$/.test(seg)) return ":id";
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          seg,
        )
      )
        return ":id";
      if (/^[0-9a-f]{16,}$/i.test(seg)) return ":id";
      return seg;
    })
    .join("/");
}

/**
 * 메트릭 레지스트리를 만들고 `/metrics` HTTP 서버를 띄운다. 프로세스당 한 번만 부른다.
 *
 * 수집하는 것:
 * - Node 기본 지표(프로세스 CPU·메모리, 이벤트루프 지연, GC, 활성 핸들)
 * - `plick_be_request_total`·`plick_be_request_duration_seconds`: apiFetch가 BE를
 *   부른 결과. 서버 컴포넌트와 서버 액션 경로만 잡힌다(브라우저 fetch는 이 프로세스
 *   바깥이라 안 잡힌다).
 * - `plick_request_error_total`: Next `onRequestError`로 올라온 에러 수
 * - `plick_client_error_total`: 브라우저 에러 경계가 보고 라우트로 알려 온 에러 수
 *   (KAN-457). 경계 이름과 에러 이름만 라벨로 받는다.
 *
 * 포트가 이미 쓰이고 있으면(dev 재시작 겹침 등) 경고만 남기고 앱은 그대로 뜬다.
 * 메트릭 때문에 서비스가 못 뜨는 일은 없어야 한다.
 *
 * @param options 앱 이름과 포트
 */
export function startMetricsServer(
  options: MetricsServerOptions,
): MetricsHandle {
  const registry = new Registry();
  registry.setDefaultLabels({ app: options.app });
  collectDefaultMetrics({ register: registry });

  const beRequests = new Counter({
    name: "plick_be_request_total",
    help: "apiFetch가 BE를 부른 횟수 (서버 프로세스 기준)",
    labelNames: ["method", "path", "status"] as const,
    registers: [registry],
  });
  const beDuration = new Histogram({
    name: "plick_be_request_duration_seconds",
    help: "apiFetch BE 왕복 시간(초)",
    labelNames: ["method", "path"] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });
  const requestErrors = new Counter({
    name: "plick_request_error_total",
    help: "Next onRequestError로 올라온 에러 수",
    labelNames: ["kind"] as const,
    registers: [registry],
  });
  const clientErrors = new Counter({
    name: "plick_client_error_total",
    help: "브라우저 에러 경계가 보고한 에러 수 (경계 이름·에러 이름별)",
    labelNames: ["boundary", "error"] as const,
    registers: [registry],
  });
  const seenBoundaries = new Set<string>();
  const seenErrorNames = new Set<string>();
  const capLabel = (seen: Set<string>, value: string): string => {
    if (seen.has(value)) return value;
    if (seen.size >= MAX_CLIENT_ERROR_LABEL_VALUES) return "other";
    seen.add(value);
    return value;
  };

  setApiFetchObserver((outcome: ApiFetchOutcome) => {
    const path = normalizePath(outcome.path);
    beRequests.inc({
      method: outcome.method,
      path,
      status: String(outcome.status),
    });
    beDuration.observe(
      { method: outcome.method, path },
      outcome.durationMs / 1000,
    );
  });

  const server = createServer(async (req, res) => {
    if (req.url?.split("?")[0] !== "/metrics") {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = await registry.metrics();
      res.writeHead(200, { "Content-Type": registry.contentType }).end(body);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  server.on("error", (error) => {
    console.warn(
      `[metrics] :${options.port} 를 열지 못했다. 메트릭 없이 계속 뜬다. ${String(error)}`,
    );
  });
  server.listen(options.port, () => {
    console.log(`[metrics] ${options.app} /metrics on :${options.port}`);
  });

  const handle: MetricsHandle = {
    recordRequestError(kind) {
      requestErrors.inc({ kind });
    },
    recordClientError(boundary, error) {
      clientErrors.inc({
        boundary: capLabel(seenBoundaries, boundary),
        error: capLabel(seenErrorNames, error),
      });
    },
  };
  setMetricsHandle(handle);
  return handle;
}
