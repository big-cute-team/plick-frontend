import Link from "next/link";

/**
 * 라이브 서브탭(경기/순위). 홈 팀 필터(KAN-350)처럼 서브탭을 URL로 승격한
 * 두 라우트(`/live`, `/live/standings`)를 잇는 알약 탭이다. 두 지면은 화면
 * 구성이 완전히 달라 필터 탭의 `replaceState` 방식 대신 평범한 소프트
 * 내비게이션으로 오간다.
 *
 * @param active - 현재 라우트가 어느 탭인지
 */
export function LiveSubTabs({ active }: { active: "matches" | "standings" }) {
  const tabs = [
    { key: "matches", label: "경기", href: "/live" },
    { key: "standings", label: "순위", href: "/live/standings" },
  ] as const;

  return (
    <nav aria-label="라이브 보기 전환" className="px-edge flex gap-2 pt-3">
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-pill text-body border px-4 py-1.5 active:opacity-80 ${
              on
                ? "bg-accent-tint text-accent border-accent-border font-extrabold"
                : "bg-elevate text-text-3 border-transparent font-semibold"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
