import { llmsTxt } from "@plick/domain/llms";
import { SITE_URL } from "@/_constants/site";

/**
 * `/llms.txt` (KAN-623) — AI 검색·어시스턴트용 사이트 안내문. 본문은 `@plick/domain/llms`가
 * 만들고 여기는 절대 URL만 넘긴다. 폴더 이름에 점이 있어 proxy matcher(확장자 포함 경로
 * 제외)를 타지 않고, 빌드 시점에 정적으로 굳는다. `public/`에 두지 않은 이유는 배포가
 * `public/`을 CDN과 standalone에 따로 복사하는 스텝에 기대는 데다 사이트 URL이 빌드
 * 환경별로 달라서다.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(llmsTxt({ siteUrl: SITE_URL }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
