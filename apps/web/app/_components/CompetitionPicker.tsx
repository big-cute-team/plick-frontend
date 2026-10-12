"use client";

import type { CompetitionOption } from "@plick/domain/team-profile";

/**
 * 대회 선택 (KAN-599 임시 구현). 선수단 표와 기록 탭, 팀 내 순위가 이 선택을 따른다.
 * 디자인과 기본 대회는 KAN-597이 정하므로 이 컴포넌트만 갈아 끼우면 되게 선택값은
 * `TeamProfileView`가 갖고 여기는 제어형 텍스트 버튼 줄이다. 대회가 하나면 호출부가 그리지 않는다.
 *
 * @param options 대회 선택지(EPL 먼저)
 * @param value 선택된 대회 id
 * @param onChange 다른 대회를 눌렀을 때
 */
export function CompetitionPicker({
  options,
  value,
  onChange,
}: {
  options: CompetitionOption[];
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <div role="group" aria-label="대회" className="flex items-center gap-3">
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={`text-label focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2 ${
              on
                ? "text-accent font-bold"
                : "text-text-3 hover:text-text-strong"
            }`}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
