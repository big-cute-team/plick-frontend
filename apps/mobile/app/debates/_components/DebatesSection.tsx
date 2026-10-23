import { unstable_rethrow } from "next/navigation";
import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { DebatesFeed } from "./DebatesFeed";

/**
 * 투표 탭 줄과 리스트, 그 씨앗. 첫 리스트는 서버에서 받아 씨앗으로 내려준다.
 * 토큰 없이 받아 페이지를 익명 ISR로 캐시한다 (KAN-664, ADR 0200). 내가 투표한 쪽
 * (`myVote`)은 카드가 내 상태 캐시에서 얹는다. 기사 상세와 같은 규약이다.
 *
 * `DebatesScreen`이 Suspense로 감싸 스트리밍한다 (KAN-602). ISR이 된 뒤에는 재생성
 * 중에만 의미가 있다.
 */
export async function DebatesSection() {
  let initial: InitialDebateList | undefined;
  try {
    initial = {
      items: await getDebates(),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    /* Next가 제어 흐름으로 쓰는 예외(정적 생성 중단 등)는 되던진다 (KAN-632). 삼키면 빌드
       로그에 "로드 실패"로 찍히고 라우트 판정을 가로챌 수 있다 */
    unstable_rethrow(error);
    // 서버에서 못 받아도 클라가 다시 받아 리스트 자리에만 에러와 재시도를 보여준다
    console.error("[debates] 투표 리스트 초기 로드 실패:", error);
  }

  return <DebatesFeed initial={initial} />;
}
