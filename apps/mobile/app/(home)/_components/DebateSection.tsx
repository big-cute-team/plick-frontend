import { unstable_rethrow } from "next/navigation";
import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { DebateHomeTicker } from "./DebateHomeTicker";

/** 익명 투표 목록을 씨앗으로 보낸다. 띠(KAN-710)는 진행 중인 것만 돌리고 참여는 기사에서 한다. */
export async function DebateSection() {
  let initial: InitialDebateList | undefined;
  try {
    initial = { items: await getDebates(), fetchedAt: Date.now() };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[home] 투표 로드 실패:", error);
  }
  return <DebateHomeTicker initial={initial} />;
}
