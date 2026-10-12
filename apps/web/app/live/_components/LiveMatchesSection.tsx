import { getMatches } from "@plick/core/live";
import type { InitialMatchList } from "@plick/domain/live";
import { LiveMatchesFeed } from "./LiveMatchesFeed";

/**
 * 그 날짜의 경기 목록과 씨앗. 서버 씨앗 + 클라 폴링이고, 서버 fetch가 실패하면 씨앗
 * 없이 내려보내 클라가 다시 받는다.
 *
 * LIVE 페이지가 Suspense로 감싸 스트리밍한다 (KAN-602). 경기 조회는 BE가 느릴 때
 * 가장 오래 걸리는 호출이라, 그동안 제목과 날짜 줄은 먼저 서 있다.
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
