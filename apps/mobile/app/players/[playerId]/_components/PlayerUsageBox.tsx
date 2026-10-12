import { usageCounts, type PlayerMatch } from "@plick/domain/player-profile";
import { ProfileSection } from "@/_components/ProfileSection";
import { LiveLoadError } from "@/live/_components/LiveLoadError";

/**
 * 개요 "시즌 출전" (KAN-604, 시안 선수 프로필 모바일). `elevate-2` 상자에 막대 8(pill, 선발
 * 강조색, 교체 `accent-bright`, 결장 `muted` 바탕)과 세 칸 수치다. 소속팀 시즌 경기의 출전
 * 형태를 세고 기록 조회 실패(UNKNOWN) 경기는 뺀다. 대회 선택과 무관하다(웹 레일과 같다).
 *
 * @param matches 경기 기록. null이면 불러오지 못한 것
 */
export function PlayerUsageBox({ matches }: { matches: PlayerMatch[] | null }) {
  if (matches === null) {
    return (
      <ProfileSection title="시즌 출전">
        <LiveLoadError />
      </ProfileSection>
    );
  }
  const { started, sub, absent } = usageCounts(matches);
  const total = started + sub + absent;
  const width = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  const cells = [
    { label: "선발", value: started, swatch: "bg-accent" },
    { label: "교체", value: sub, swatch: "bg-accent-bright" },
    { label: "결장", value: absent, swatch: "bg-muted" },
  ];

  return (
    <ProfileSection title="시즌 출전">
      <div className="bg-elevate-2 rounded-card p-3.5">
        <div
          aria-hidden
          className="bg-muted rounded-pill flex h-2 overflow-hidden"
        >
          <span className="bg-accent" style={{ width: width(started) }} />
          <span className="bg-accent-bright" style={{ width: width(sub) }} />
        </div>
        <dl className="grid grid-cols-3 pt-3">
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col gap-1">
              <dt className="text-caption text-text-3 flex items-center gap-1.25">
                <span
                  aria-hidden
                  className={`${cell.swatch} rounded-badge size-2`}
                />
                {cell.label}
              </dt>
              <dd className="text-title tracking-title text-text-strong font-black tabular-nums">
                {cell.value}경기
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </ProfileSection>
  );
}
