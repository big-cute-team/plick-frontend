import { unstable_rethrow } from "next/navigation";
import { getPredictionHome } from "@plick/core/predictions";
import type { PredictionHomeCard } from "@plick/domain/prediction";
import { PredictionHomeTrack } from "./PredictionHomeTrack";

/**
 * 홈 승부예측 섹션 (KAN-700, 시안 가이드 §2 H1, 모바일 `PredictionSection`의 웹 판). 핫이슈 위에
 * 카드 3장이 한 줄로 서고 넘치면 가로 스크롤이다. `GET /api/v1/predictions/home`을 서버에서 토큰
 * 없이 한 번 받아 씨앗으로 내리고, 내 픽과 분포 같은 유저별 값은 클라 훅이 마운트 뒤 다시 받는다.
 * 홈이 익명 ISR이라 서버 HTML에 사용자별 값을 싣지 않는다.
 *
 * `HomeScreen`이 Suspense로 감싸 스트리밍한다. 실패해도 페이지를 떨어뜨리지 않고 씨앗 없이 내려
 * 클라가 처음부터 받게 한다.
 */
export async function PredictionSection() {
  let cards: PredictionHomeCard[] | undefined;
  try {
    cards = await getPredictionHome();
  } catch (error) {
    /* Next가 제어 흐름으로 쓰는 예외(정적 생성 중단 등)는 되던진다 (KAN-667) */
    unstable_rethrow(error);
    console.error("[home] 승부예측 로드 실패:", error);
  }
  return <PredictionHomeTrack initial={cards} />;
}
