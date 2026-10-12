import { getMatches } from "@plick/core/live";
import type { InitialMatchList } from "@plick/domain/live";
import { LiveMatchesFeed } from "./LiveMatchesFeed";

/**
 * 그 날짜의 경기 목록과 씨앗. 첫 목록은 서버에서 받아 씨앗으로 내려주고(토론 리스트와
 * 같은 패턴), 이후 폴링·재시도는 클라 훅이 맡는다. 서버 fetch가 실패하면(502 등)
 * 씨앗 없이 내려보내 클라가 다시 받고, 그것도 실패하면 목록 자리에만 에러 지면이 선다.
 *
 * LIVE 페이지가 Suspense로 감싸 스트리밍한다 (KAN-602). 경기 조회는 BE가 느릴 때
 * 가장 오래 걸리는 호출이라, 그동안 날짜 줄과 채팅방 배너는 먼저 서 있다.
 *
 * @param date 보고 있는 날짜 키
 */
export async function LiveMatchesSection({ date }: { date: string }) {
  let initial: InitialMatchList | undefined;
  try {
    initial = { items: await getMatches(date), fetchedAt: Date.now() };
  } catch (error) {
    console.error("[live] 경기 목록 초기 로드 실패:", error);
  }
  return <LiveMatchesFeed date={date} initial={initial} />;
}
