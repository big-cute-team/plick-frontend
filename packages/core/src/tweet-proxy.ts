/**
 * @file 트윗 임베드 데이터 프록시 응답 (KAN-284, 공용 승격과 압축 KAN-673).
 *
 * 두 앱의 `app/api/tweet/[id]/route.ts`가 이 함수 하나를 부른다. 클라이언트 `TweetEmbed`가
 * 부르는 곳이고, react-tweet의 기본 클라 엔드포인트(react-tweet.vercel.app)는 공용 rate limit을
 * 타므로 트위터 신디케이션 API를 우리 서버가 직접 받아 같은 `{ data }` 모양으로 돌려준다.
 *
 * 압축을 여기서 직접 건다. Next 16은 라우트 핸들러 응답 헤더를 자체 `appendHeader`로 옮기면서
 * `content-type`을 배열(`["application/json"]`)로 저장하고, 내장 압축 미들웨어(`compression`)의
 * 압축 가능 판정은 문자열만 받아 이 응답을 걸러 낸다. 길이도 없는 chunked 응답이라 CloudFront
 * 엣지 압축(Content-Length 필요)도 건너뛰었다. 그래서 JSON이 날것으로 나갔다.
 */

import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { getTweet } from "react-tweet/api";

/** 이 크기(바이트) 미만은 압축하지 않는다. `{"data":null}`처럼 작은 응답은 오히려 커진다 */
const COMPRESS_THRESHOLD = 1024;

/**
 * 브로틀리 품질. 기본 11은 수십 KB에도 수 ms를 쓰는데, 응답이 CDN·브라우저에 하루 캐시돼
 * 압축은 드물게 돈다. 그래도 매 미스마다 동기로 도는 몫이라 gzip과 비슷한 속도의 5로 둔다.
 */
const BROTLI_QUALITY = 5;

/** 트윗 본문은 사실상 불변이라 성공 응답은 CDN·브라우저가 하루 재사용한다 */
const FOUND_CACHE = "public, max-age=86400";

/**
 * 없는 트윗(원문 삭제·비공개 전환)은 404가 아니라 200 `{ data: null }`로 준다. 404는 브라우저가
 * 콘솔 에러로 찍어 Lighthouse `errors-in-console`에 걸린다. 임베드는 `data === null`을 실패와
 * 같게 보고 안내 문구를 세우므로 화면은 같다. 삭제가 되살아나지는 않지만 신디케이션이 잠깐
 * 못 찾는 경우도 있어 성공보다 짧게 한 시간만 캐시한다.
 */
const MISSING_CACHE = "public, max-age=3600";

/** 잘못된 id와 신디케이션 장애는 캐시하지 않는다 */
const ERROR_CACHE = "no-store";

export type ContentEncoding = "br" | "gzip" | "identity";

/**
 * `Accept-Encoding`에서 응답 인코딩을 고른다. br을 gzip보다 먼저 쓰고, `q=0`으로 거부한 것은
 * 고르지 않는다. CloudFront는 캐시 정책에서 정규화한 값(`br,gzip` 또는 `gzip`)을 넘긴다.
 *
 * @param acceptEncoding 요청의 `Accept-Encoding` 헤더 값
 * @example pickEncoding("gzip, deflate, br") // "br"
 * @example pickEncoding("br;q=0, gzip") // "gzip"
 */
export function pickEncoding(acceptEncoding: string | null): ContentEncoding {
  if (!acceptEncoding) return "identity";
  const accepted = new Set<string>();
  for (const part of acceptEncoding.split(",")) {
    const [token = "", ...params] = part.trim().toLowerCase().split(";");
    const q = params
      .map((p) => p.replace(/\s+/g, ""))
      .find((p) => p.startsWith("q="));
    if (q && Number(q.slice(2)) === 0) continue;
    accepted.add(token.trim());
  }
  if (accepted.has("br")) return "br";
  if (accepted.has("gzip") || accepted.has("*")) return "gzip";
  return "identity";
}

/**
 * JSON 응답을 요청이 받는 인코딩으로 압축해 만든다. 길이를 알고 보내므로 `Content-Length`도 단다.
 *
 * @param request 들어온 요청 (`Accept-Encoding`을 읽는다)
 * @param body JSON으로 직렬화할 값
 * @param status 응답 상태 코드
 * @param cacheControl `Cache-Control` 값. 없으면 달지 않는다
 */
export function compressedJson(
  request: Request,
  body: unknown,
  status: number,
  cacheControl?: string,
): Response {
  const raw = Buffer.from(JSON.stringify(body));
  const encoding =
    raw.length < COMPRESS_THRESHOLD
      ? "identity"
      : pickEncoding(request.headers.get("accept-encoding"));
  const payload =
    encoding === "br"
      ? brotliCompressSync(raw, {
          params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY },
        })
      : encoding === "gzip"
        ? gzipSync(raw)
        : raw;

  const headers = new Headers({
    "Content-Type": "application/json",
    "Content-Length": String(payload.length),
    Vary: "Accept-Encoding",
  });
  if (encoding !== "identity") headers.set("Content-Encoding", encoding);
  if (cacheControl) headers.set("Cache-Control", cacheControl);
  return new Response(new Uint8Array(payload), { status, headers });
}

/**
 * `/api/tweet/[id]` 응답. 숫자가 아닌 id는 400, 신디케이션 장애는 502이고 둘 다 `no-store`다.
 * 지금 CloudFront 캐시 정책은 기본 TTL이 0이라 헤더가 없어도 캐시하지 않지만, 장애 응답이
 * 정책 변경 하나로 굳지 않게 명시한다.
 *
 * @param request 들어온 요청
 * @param id 라우트 파라미터의 트윗 id
 */
export async function tweetProxyResponse(
  request: Request,
  id: string,
): Promise<Response> {
  if (!/^\d+$/.test(id)) {
    return compressedJson(request, { data: null }, 400, ERROR_CACHE);
  }
  try {
    const tweet = await getTweet(id);
    return tweet
      ? compressedJson(request, { data: tweet }, 200, FOUND_CACHE)
      : compressedJson(request, { data: null }, 200, MISSING_CACHE);
  } catch {
    /* 신디케이션 API 장애. 임베드는 조용히 안내 문구로 폴백한다 */
    return compressedJson(request, { data: null }, 502, ERROR_CACHE);
  }
}
