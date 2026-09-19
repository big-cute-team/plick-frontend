/**
 * @file 서버 측 `apiFetch`에 분석 헤더 넷을 실어 주는 제공자 (KAN-542).
 *
 * 값은 여기서 만들지 않는다. `proxy.ts`가 요청마다 쿠키와 URL에서 정해 나가는 요청 헤더에
 * `X-Plick-*`로 찍어 두고, 서버 컴포넌트와 서버 액션은 `headers()`로 그 요청 헤더를 읽을 수
 * 있다. 그걸 그대로 옮겨 싣는다. 값을 정하는 자리가 프록시 하나라 두 경로(브라우저 `/be`
 * fetch, 서버 fetch)의 헤더가 어긋나지 않는다.
 *
 * 서버 액션이 아니라 렌더 중 요청 헤더를 읽을 뿐이라 `"use server"`를 붙이지 않는다.
 * 등록은 `instrumentation.ts`가 서버가 뜰 때 한 번 한다.
 */

import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { ANALYTICS_HEADER_NAMES } from "@plick/core/analytics";

/**
 * 지금 요청의 분석 헤더 넷을 돌려준다. 프록시가 안 찍은 이름은 빼서 BE가 `unknown`으로 접게 둔다.
 *
 * 요청 컨텍스트 밖(서버가 뜨는 중, 빌드 시점 정적 생성)에서 `headers()`는 던진다. 그때는
 * 빈 헤더로 통과시킨다 - 분석 값 때문에 호출이 실패하면 안 된다. 단 Next가 제어 흐름으로
 * 쓰는 예외(정적 생성 중단 등)는 `unstable_rethrow`로 되던져 라우트 판정을 가로채지 않는다.
 *
 * @returns 헤더 이름 → 값. 없으면 빈 객체
 */
export async function getAnalyticsHeaders(): Promise<Record<string, string>> {
  let incoming: Headers;
  try {
    incoming = await headers();
  } catch (error) {
    unstable_rethrow(error);
    return {};
  }
  const out: Record<string, string> = {};
  for (const name of ANALYTICS_HEADER_NAMES) {
    const value = incoming.get(name);
    if (value) out[name] = value;
  }
  return out;
}
