import { NextResponse, type NextRequest } from "next/server";
import { chatSocketUrl } from "@plick/core/chat";
import { getAccessToken } from "@/_services/session";

/**
 * 채팅 접속 주소 발급 (KAN-458). 브라우저가 `GET /live/chat/session?matchId=`로
 * 부르면 완성된 `wss://…/ws/chat?matchId=&token=`을 돌려준다.
 *
 * 왜 서버가 조립하나: BE 채팅은 토큰을 쿼리 파라미터로 받는데(브라우저 웹소켓
 * API가 헤더를 못 붙인다), 우리 access 토큰은 HttpOnly 쿠키라 브라우저 JS가 못
 * 읽는다. `/be` 프록시는 rewrites라 웹소켓 업그레이드를 넘겨주지 못한다. 그래서
 * 쿠키를 읽을 수 있는 서버가 토큰을 꺼내 주소에 실어 준다.
 *
 * 경로가 `/api` 밖인 이유: `proxy.ts`의 matcher가 `/api`를 제외한다. 이 라우트는
 * 프록시를 지나야 한다 — access 쿠키가 만료됐지만 refresh가 남은 상태로 채팅에
 * 다시 붙을 때, 프록시가 재발급한 새 access를 여기서 읽게 하기 위해서다.
 *
 * 토큰은 응답 본문으로만 나간다. 로그에 남지 않게 URL에 실지 않고 `no-store`다.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("matchId") ?? "";
  if (!/^\d+$/.test(raw)) {
    return NextResponse.json({ code: "BAD_MATCH_ID" }, { status: 400 });
  }
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  }
  return NextResponse.json(
    { url: chatSocketUrl(Number(raw), token) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
