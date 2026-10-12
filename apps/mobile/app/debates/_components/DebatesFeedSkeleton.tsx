import { DEBATE_TABS } from "@/_constants/debates";
import { DebateListSkeleton } from "./DebateListSkeleton";

/**
 * 투표 탭 줄과 카드 리스트의 로딩 자리 (KAN-602). 라우트 `loading.tsx`와
 * `DebatesScreen`의 Suspense fallback이 같이 쓴다. 탭 줄은 어느 탭이 열릴지 아직 몰라
 * 밑줄 없이 라벨만 둔다.
 */
export function DebatesFeedSkeleton() {
  return (
    <>
      <div aria-hidden className="border-border px-edge flex gap-5 border-b">
        {DEBATE_TABS.map(({ key, label }) => (
          <span
            key={key}
            className="text-tab text-text-3 shrink-0 border-b-2 border-transparent pt-3 pb-2.5 font-medium"
          >
            {label}
          </span>
        ))}
      </div>
      <section className="px-edge">
        <DebateListSkeleton />
      </section>
    </>
  );
}
