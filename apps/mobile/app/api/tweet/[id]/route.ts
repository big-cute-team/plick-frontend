import { tweetProxyResponse } from "@plick/core/tweet-proxy";

/**
 * 트윗 임베드 데이터 프록시 (KAN-284, 공용 승격 KAN-673). 압축과 캐시, 없는 트윗 처리까지 두 앱이 같은
 * {@link tweetProxyResponse}를 쓴다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return tweetProxyResponse(request, id);
}
