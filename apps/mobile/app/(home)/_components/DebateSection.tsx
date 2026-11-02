import { unstable_rethrow } from "next/navigation";
import { getDebates } from "@plick/core/debates";
import type { InitialDebateList } from "@plick/domain/types";
import { DebateHomeTrack } from "./DebateHomeTrack";

/** 익명 투표 목록을 씨앗으로 보내고 개인 참여 상태는 브라우저에서 확인한다. */
export async function DebateSection() {
  let initial: InitialDebateList | undefined;
  try {
    initial = { items: await getDebates(), fetchedAt: Date.now() };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[home] 투표 로드 실패:", error);
  }
  return <DebateHomeTrack initial={initial} />;
}
