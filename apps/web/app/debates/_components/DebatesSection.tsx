import { unstable_rethrow } from "next/navigation";
import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { getAccessToken } from "@/_services/session";
import type { DebateTab } from "@/_types/debates";
import { DebatesFeed } from "./DebatesFeed";

/**
 * 투표 목록과 그 씨앗. 첫 리스트는 서버에서 받아 씨앗으로 내려준다. `myVote`(내가
 * 투표한 카드 표시)가 유저별 값이라 토큰을 실어 부른다. 기사 상세와 같은 규약이다.
 *
 * `DebatesScreen`이 Suspense로 감싸 스트리밍한다 (KAN-602). 토큰을 실은 조회라
 * 캐시를 못 타서 BE가 느리면 그대로 느린데, 그동안 제목과 탭 줄은 먼저 서 있다.
 *
 * @param tab 지금 탭
 */
export async function DebatesSection({ tab }: { tab: DebateTab }) {
  let initial: InitialDebateList | undefined;
  try {
    const accessToken = await getAccessToken();
    initial = {
      items: await getDebates(accessToken ? { accessToken } : undefined),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    /* Next가 제어 흐름으로 쓰는 예외(정적 생성 중단 등)는 되던진다 (KAN-667). 삼키면 빌드
       로그에 "로드 실패"로 찍히고 라우트 판정을 가로챌 수 있다 */
    unstable_rethrow(error);
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[debates] 토론 리스트 초기 로드 실패:", error);
  }

  return <DebatesFeed initial={initial} tab={tab} />;
}
