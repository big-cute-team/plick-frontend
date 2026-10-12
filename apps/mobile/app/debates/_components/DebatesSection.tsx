import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { getAccessToken } from "@/_services/session";
import { DebatesFeed } from "./DebatesFeed";

/**
 * 투표 탭 줄과 리스트, 그 씨앗. 첫 리스트는 서버에서 받아 씨앗으로 내려준다.
 * `myVote`(내가 투표한 카드 표시)가 유저별 값이라 토큰을 실어 부른다. 기사 상세와
 * 같은 규약이다.
 *
 * `DebatesScreen`이 Suspense로 감싸 스트리밍한다 (KAN-602). 토큰을 실은 조회라
 * 캐시를 못 타서 BE가 느리면 그대로 느린데, 그동안 상단바와 뼈대는 먼저 서 있다.
 */
export async function DebatesSection() {
  let initial: InitialDebateList | undefined;
  try {
    const accessToken = await getAccessToken();
    initial = {
      items: await getDebates(accessToken ? { accessToken } : undefined),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[debates] 투표 리스트 초기 로드 실패:", error);
  }

  return <DebatesFeed initial={initial} />;
}
