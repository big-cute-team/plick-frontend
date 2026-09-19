/**
 * @file Next instrumentation 훅 (KAN-455). 서버 프로세스가 뜰 때 한 번 `register`가
 * 불리고, 요청 처리 중 잡힌 에러마다 `onRequestError`가 불린다.
 *
 * 여기서 프로메테우스 메트릭 서버를 Next와 별도 포트에 띄운다. 파일 위치와 export
 * 이름은 Next 규약이라 바꿀 수 없다(앱 루트, `register`·`onRequestError`).
 *
 * `register`는 Node와 Edge 두 런타임에서 각각 불린다. Edge에는 `node:http`가 없으니
 * Node 런타임일 때만, 그것도 동적 import로 메트릭 모듈을 불러온다. 정적 import를
 * 쓰면 Edge 번들에도 prom-client가 딸려 들어가 빌드가 깨진다.
 *
 * 서버 측 `apiFetch`가 분석 헤더 넷을 싣게 하는 제공자(KAN-542)도 여기서 꽂는다. 페이지와
 * 서버 액션 번들이 각자 `apiFetch` 복사본을 갖지만 제공자 슬롯은 `globalThis`라 한 번이면 된다.
 */

import type { Instrumentation } from "next";
import { setApiFetchHeaderProvider } from "@plick/core/client";
import type { MetricsHandle } from "@plick/core/metrics";

/** 메트릭 포트. 인스턴스 하나에 web·mobile이 같이 뜨므로 앱마다 다르다. */
const DEFAULT_METRICS_PORT = 9465;

let metrics: MetricsHandle | null = null;

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getAnalyticsHeaders } = await import("@/_services/analytics-headers");
  setApiFetchHeaderProvider(getAnalyticsHeaders);
  const { startMetricsServer } = await import("@plick/core/metrics");
  metrics = startMetricsServer({
    app: "web",
    port: Number(process.env.METRICS_PORT) || DEFAULT_METRICS_PORT,
  });
}

/**
 * Next가 요청 처리 중 잡은 에러. `context.routerKind`(App/Pages Router)와
 * `routeType`(render·route·action·middleware)으로 어디서 났는지 라벨을 단다.
 * 에러바운더리가 잡는 클라 렌더 에러는 브라우저 안이라 여기 안 온다.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  _error,
  _request,
  context,
) => {
  metrics?.recordRequestError(context.routeType);
};
