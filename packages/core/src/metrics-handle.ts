/**
 * @file 메트릭 핸들 전역 공유 (KAN-457).
 *
 * 핸들은 `instrumentation.ts`의 `register`가 만든다. 그런데 클라 에러 보고 라우트
 * 핸들러는 다른 모듈이라 그 변수에 닿을 수 없고, `instrumentation.ts`를 import하는
 * 것도 Next 규약 밖이다. `client.ts`의 관측자와 같은 방식으로 `Symbol.for` 전역에
 * 걸어 두고 꺼내 쓴다. 이 파일은 Node 전용 의존이 없어 어느 번들에 들어가도 된다.
 */

/**
 * 앱 프로세스가 노출하는 메트릭 핸들. `instrumentation.ts`가 들고 있다가
 * `onRequestError`에서 카운터를 올리고, 클라 에러 보고 라우트가 전역에서 꺼내 쓴다.
 */
export interface MetricsHandle {
  /** Next가 요청 처리 중 잡은 에러(렌더·라우트 핸들러·서버 액션) 한 건을 센다. */
  recordRequestError(kind: string): void;
  /**
   * 브라우저 에러 경계가 보고한 에러 한 건을 센다 (KAN-457).
   *
   * @param boundary 경계 이름 (`ArticleComments`, `route` 등)
   * @param error 에러 이름 (`TypeError`, `ApiError:404` 등)
   */
  recordClientError(boundary: string, error: string): void;
}

const HANDLE_KEY = Symbol.for("plick.metricsHandle");

/** `startMetricsServer`가 만든 핸들을 전역에 건다. */
export function setMetricsHandle(handle: MetricsHandle | null): void {
  (globalThis as Record<symbol, MetricsHandle | null>)[HANDLE_KEY] = handle;
}

/** 전역에 걸린 핸들. 메트릭 서버가 안 떴으면(Edge, 테스트) null. */
export function getMetricsHandle(): MetricsHandle | null {
  return (
    (globalThis as Record<symbol, MetricsHandle | null | undefined>)[
      HANDLE_KEY
    ] ?? null
  );
}
