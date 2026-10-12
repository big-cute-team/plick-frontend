import { getReels } from "@plick/core/reels";
import type { InitialReelFeed } from "@plick/domain/types";
import { getAccessToken } from "@/_services/session";
import { ReelsWorkspace } from "./ReelsWorkspace";

/**
 * 릴 작업 영역과 그 씨앗. 첫 페이지는 `GET /api/v1/reels`로 여기서 미리 받아
 * 내려준다 (KAN-323). 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고,
 * 끝에 가까워지면 클라가 커서로 이어받는다.
 *
 * 릴스 페이지가 Suspense로 감싸 스트리밍한다 (KAN-602). 토큰을 실은 조회라 캐시를
 * 못 타서 BE가 느리면 그대로 느린데, 그동안 상단 바와 릴 뼈대는 먼저 서 있다.
 */
export async function ReelsFeedSection() {
  let initial: InitialReelFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다.
    // 토큰을 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다 (KAN-308)
    const page = await getReels({ accessToken: await getAccessToken() });
    initial = { page, fetchedAt: Date.now() };
  } catch (e) {
    // 서버에서 못 받아도 페이지 전체를 에러로 떨어뜨리지 않는다.
    // 클라가 다시 받아 뷰어 자리에 에러와 재시도 버튼을 보여준다.
    console.error("[reels] 릴스 피드 초기 로드 실패:", e);
  }

  return <ReelsWorkspace initial={initial} />;
}
