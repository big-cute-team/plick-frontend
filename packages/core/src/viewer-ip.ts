/**
 * @file 방문자 IP를 BE까지 믿을 수 있게 전달하기 (KAN-680).
 *
 * FE 서버가 BE를 대신 부르는 호출(게스트 발급)은 새 연결이라 BE에는 FE 인스턴스 IP가 닿는다.
 * BE의 IP 상한(`auth-guest`)이 그 값을 세면 방문자별이 아니라 인스턴스당 공용 상한이 된다.
 * 들어온 `X-Forwarded-For`를 그대로 넘기면 첫 값을 요청자가 지어낼 수 있어 더 나쁘다. 믿을 수
 * 있는 값은 CloudFront가 직접 적어 주는 `CloudFront-Viewer-Address` 하나다. ALB가 CloudFront
 * 요청만 받으므로(`X-Origin-Verify`, 프리픽스 리스트) 이 헤더가 왔다면 CloudFront가 본 연결 주소다.
 *
 * 헤더가 없으면(로컬, 오리진 요청 정책이 아직 `AllViewer`인 배포) 아무것도 싣지 않는다. 틀어져도
 * 지금과 같은 상태(인스턴스 공용 상한)로 남고 더 나빠지지는 않는다. 경위는 ADR 0215 후속 절.
 */

/** CloudFront가 오리진 요청 정책에 따라 담아 주는 방문자 `ip:port`. 소문자로 읽는다 */
export const VIEWER_ADDRESS_HEADER = "cloudfront-viewer-address";

/** BE `RateLimitAspect.clientIp()`가 첫 값을 읽는 헤더 */
export const FORWARDED_FOR_HEADER = "X-Forwarded-For";

/**
 * `CloudFront-Viewer-Address` 값에서 포트를 뗀 IP. 형식은 `198.51.100.10:46532`이고 IPv6는
 * 대괄호 유무가 문서에 없어 둘 다 받는다(`[2001:db8::1]:443`, `2001:db8::1:443`). CloudFront는
 * 항상 포트를 붙이므로 마지막 콜론 뒤가 포트다. 쉼표나 공백이 섞인 값은 체인 주입이 될 수 있어
 * 버린다.
 *
 * @param value 헤더 원문
 * @returns IP, 값이 없거나 모양이 아니면 null
 */
export function stripViewerPort(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw || /[\s,]/.test(raw)) return null;
  const bracket = raw.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracket) return bracket[1] ?? null;
  const last = raw.lastIndexOf(":");
  if (last === -1) return raw;
  const port = raw.slice(last + 1);
  if (!/^\d+$/.test(port)) return null;
  return raw.slice(0, last) || null;
}

/**
 * FE 서버가 BE를 대신 부를 때 실을 방문자 IP 헤더. CloudFront가 적어 준 주소가 있을 때만
 * `X-Forwarded-For`에 그 값 하나를 싣는다. 들어온 `X-Forwarded-For` 체인은 보지 않는다.
 *
 * @param headers 브라우저에서 FE에 도착한 요청 헤더
 * @returns BE 호출 헤더에 펼칠 객체. 실을 게 없으면 빈 객체
 */
export function viewerForwardedHeaders(
  headers: Headers,
): Record<string, string> {
  const ip = stripViewerPort(headers.get(VIEWER_ADDRESS_HEADER));
  return ip ? { [FORWARDED_FOR_HEADER]: ip } : {};
}
