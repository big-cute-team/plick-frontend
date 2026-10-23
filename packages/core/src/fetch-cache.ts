/**
 * @file 서버 `apiFetch`가 호출 하나를 Next 데이터 캐시에 어떻게 둘지 가르는 순수 판정 (KAN-308, KAN-380, KAN-632).
 * `client.ts`에서 떼어 낸 이유는 테스트다. `client.ts`의 `ApiError`가 매개변수 프로퍼티를 써서
 * Node의 타입 걷어내기 모드로는 못 읽고, 이 판정은 그 파일에서 한 번 틀렸던 자리라 표로 고정해 둔다.
 */

/** Next가 `RequestInit`에 얹는 데이터 캐시 옵션. `@plick/core`는 Next에 의존하지 않아 여기서 좁게 선언한다. */
export type CacheInit = {
  method?: string;
  cache?: RequestCache;
  next?: { revalidate?: number | false };
};

/**
 * 호출부가 캐시 옵션을 안 줬고 토큰도 없는 GET인가. 이런 호출에만 기본 캐시 수명(60초)을 붙인다.
 * 호출부가 `cache`나 `next`를 직접 넘겼으면 그 뜻을 존중한다. 겹쳐 넘기면 Next가 둘 다 무시한다.
 *
 * @param init 호출부가 넘긴 옵션
 * @param authorized `Authorization` 헤더가 있는가
 */
export function usesDefaultCache(
  init: CacheInit | undefined,
  authorized: boolean,
): boolean {
  const isGet = (init?.method ?? "GET").toUpperCase() === "GET";
  const configured = init?.cache !== undefined || init?.next !== undefined;
  return !authorized && isGet && !configured;
}

/**
 * 데이터 캐시를 거쳐 사용자끼리 나눠 쓰는 호출인가 (KAN-632). 위 기본 캐시 대상에 더해, 호출부가
 * `next.revalidate`로 직접 수명을 준 익명 GET도 든다. `cache: "no-store"`나 `revalidate: 0`은 매번
 * BE를 도는 호출이라 아니다.
 *
 * 이 값이 true면 분석 헤더 제공자를 부르지 않는다. 그 응답은 첫 요청자의 것이 캐시에 박혀 모두에게
 * 나가므로 사람별 헤더를 실을 의미가 없고, 제공자가 읽는 `headers()`가 라우트를 동적 렌더로 판정하게
 * 만들어 ISR을 깬다. 처음엔 `usesDefaultCache`로만 갈랐다가 `revalidate`를 직접 준 호출이 빠져
 * ISR 재생성 때 "Page changed from static to dynamic at runtime, reason: headers"가 났다.
 *
 * @param init 호출부가 넘긴 옵션
 * @param authorized `Authorization` 헤더가 있는가
 */
export function sharesDataCache(
  init: CacheInit | undefined,
  authorized: boolean,
): boolean {
  const isGet = (init?.method ?? "GET").toUpperCase() === "GET";
  return (
    !authorized &&
    isGet &&
    init?.cache !== "no-store" &&
    init?.next?.revalidate !== 0
  );
}
