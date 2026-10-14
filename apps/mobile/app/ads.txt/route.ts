import { adsTxt } from "@plick/core/ads";

/**
 * `/ads.txt` (KAN-652) — 애드센스가 도메인 루트에 요구하는 판매자 선언. 본문은
 * `@plick/core/ads`가 만든다. `public/`이 아니라 라우트인 이유는 `/llms.txt`와 같다
 * (배포가 `public/`을 CDN과 standalone에 따로 복사하는 스텝에 기대지 않는다). 폴더
 * 이름에 점이 있어 proxy matcher를 타지 않고 빌드 시점에 정적으로 굳는다.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(adsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
