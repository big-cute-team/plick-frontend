import type { ReactNode } from "react";

/**
 * 설정 리스트 한 줄 — 아이콘 칩 + 라벨 + 우측 트레일링 요소.
 *
 * 카드(외곽 박스)는 호출부가 감싼다. `pressable`이면 줄 전체가 버튼으로
 * 렌더돼 눌림 피드백을 준다(퍼블리싱 단계라 동작은 아직 없음).
 * 웹·모바일 공용 (`@plick/ui`) — 데스크톱 포인터를 위해 pressable 줄에 hover·focus-visible을 둔다.
 *
 * @param icon - 좌측 칩 안 아이콘 (`text-icon` 색을 물려받음)
 * @param label - 줄 제목
 * @param trailing - 우측 요소 (배지·토글·화살표)
 * @param pressable - 줄 전체를 버튼으로 렌더할지
 */
export function SettingRow({
  icon,
  label,
  trailing,
  pressable = false,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  pressable?: boolean;
}) {
  const content = (
    <>
      <span className="bg-elevate rounded-tile text-icon grid size-8 shrink-0 place-items-center">
        {icon}
      </span>
      <span className="text-body text-text min-w-0 flex-1 text-left font-bold">
        {label}
      </span>
      {trailing}
    </>
  );
  const layout = "gap-gap flex w-full items-center px-4 py-3.5";

  return pressable ? (
    <button
      type="button"
      className={`${layout} focus-visible:outline-accent hover:bg-elevate focus-visible:outline-2 focus-visible:-outline-offset-2 active:opacity-60`}
    >
      {content}
    </button>
  ) : (
    <div className={layout}>{content}</div>
  );
}
