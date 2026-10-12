"use client";

/**
 * 프로필 탭 줄 (KAN-604, 시안 프로필 공통). 스크롤 본문 안에서 `sticky top-0`으로 붙어
 * 어디서든 탭을 바꿀 수 있다. 높이 44, 탭 사이 22, 활성은 900 진한 글자에 2px 강조
 * 밑줄(inset 그림자), 비활성은 500 보조색이다. 팀 프로필과 선수 프로필이 같이 쓴다.
 * 제어형이라 선택은 부모가 갖는다.
 *
 * 스크롤 영역의 좌우 여백(`px-edge`) 안에 놓여도 바탕과 밑선이 화면 끝까지 가도록
 * `-mx-edge`로 넓힌다.
 *
 * @param label 탭 목록 접근성 이름
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
      className="border-border bg-bg -mx-edge px-edge sticky top-0 z-10 flex h-11 gap-5.5 border-b"
    >
      {tabs.map(({ key, label: tabLabel }) => {
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(key)}
            className={`text-tab h-full ${
              on
                ? "text-text-strong font-black shadow-[inset_0_-2px_0_var(--color-accent)]"
                : "text-text-3 font-medium"
            }`}
          >
            {tabLabel}
          </button>
        );
      })}
    </div>
  );
}
