"use client";

/**
 * 프로필 탭 줄 (시안 프로필 공통: 높이 48, 간격 28, 활성은 900 + 강조색 2px 밑줄). 팀, 선수
 * 프로필이 같이 쓴다. 제어형이라 선택은 호출부가 갖는다.
 *
 * @param label 탭 목록의 접근성 이름
 * @param tabs 탭 키와 라벨(순서대로)
 * @param active 지금 탭
 * @param onSelect 탭을 눌렀을 때
 */
export function ProfileTabBar<K extends string>({
  label,
  tabs,
  active,
  onSelect,
}: {
  label: string;
  tabs: { key: K; label: string }[];
  active: K;
  onSelect: (key: K) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="border-border mt-1.5 flex h-12 items-stretch gap-7 border-b"
    >
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(tab.key)}
            className={`text-tab focus-visible:outline-accent -mb-px border-b-2 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${
              on
                ? "border-accent text-text-strong font-black"
                : "text-text-3 hover:text-text-strong border-transparent font-bold"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
