/**
 * 알약형 토글 스위치 (피그마 M1 26-6, 44×26 트랙 + 22 노브).
 *
 * 켜짐은 accent 트랙 + 흰 노브. 꺼짐 상태는 피그마에 없어 elevate 트랙으로 처리.
 * 웹·모바일 공용 (`@plick/ui`) — 데스크톱 포인터를 위해 hover·focus-visible을 둔다.
 *
 * @param on - 켜짐 여부
 * @param onToggle - 탭 시 호출
 * @param label - 접근성 라벨 (스위치가 무엇을 켜고 끄는지)
 */
export function ToggleSwitch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`rounded-pill focus-visible:outline-accent relative h-6.5 w-11 shrink-0 transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 ${
        on ? "bg-accent" : "bg-elevate"
      }`}
    >
      <span
        className={`bg-media-on rounded-pill absolute top-0.5 size-5.5 transition-[left] duration-200 ${
          on ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}
