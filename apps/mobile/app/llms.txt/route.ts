import { llmsTxt } from "@plick/domain/llms";
import { SITE_URL, WEB_SITE_URL } from "@/_constants/site";

/**
 * `/llms.txt` (KAN-623) — 웹과 같은 안내문을 모바일 호스트 URL로 낸다. canonical이
 * 데스크톱이라는 사실은 본문에 적힌다. 정적으로 굳는 이유와 `public/`에 두지 않는
 * 이유는 웹 라우트와 같다.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(
    llmsTxt({ siteUrl: SITE_URL, canonicalSiteUrl: WEB_SITE_URL }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
