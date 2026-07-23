import { getTweet } from "react-tweet/api";

/**
 * 트윗 임베드 데이터 프록시 (KAN-284).
 *
 * 클라이언트 TweetEmbed가 부른다. react-tweet의 기본 클라 엔드포인트
 * (react-tweet.vercel.app)는 공용 rate limit을 타므로, 트위터 신디케이션 API를
 * 우리 서버가 직접 받아 같은 `{ data }` 모양으로 돌려준다.
 *
 * 트윗 본문은 사실상 불변이라 성공 응답은 CDN·브라우저가 하루 재사용하게 둔다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ data: null }, { status: 400 });
  }

  try {
    const tweet = await getTweet(id);
    return Response.json(
      { data: tweet ?? null },
      tweet
        ? { headers: { "Cache-Control": "public, max-age=86400" } }
        : { status: 404 },
    );
  } catch {
    /* 신디케이션 API 장애 — 임베드는 조용히 placeholder로 폴백한다 */
    return Response.json({ data: null }, { status: 502 });
  }
}
