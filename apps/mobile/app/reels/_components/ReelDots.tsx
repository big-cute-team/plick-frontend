/** 활성 점 앞뒤로 함께 보여줄 점 개수. 무한스크롤로 릴이 쌓여도 점 줄이 넘치지 않게 자른다 */
const DOTS_AROUND = 3;

/**
 * 릴스 왼쪽 세로 위치 점 (시안 KAN-567 "릴스"). 폭 4px, 활성 점은 강조색 높이 14,
 * 나머지는 회색(bg-muted) 4px 원이다. 미디어 상자 왼쪽 가장자리에 세로 가운데로 선다.
 *
 * 릴이 커서로 계속 쌓이므로 전부 그리지 않고 지금 보는 릴 앞뒤 {@link DOTS_AROUND}장
 * 까지만 그린다(시안은 4장 고정). 누르면 그 릴로 넘어간다.
 *
 * @param count - 지금 렌더된 릴 수
 * @param active - 보고 있는 릴 순번
 * @param onPick - 점을 눌렀을 때 그 순번으로 이동
 */
export function ReelDots({
  count,
  active,
  onPick,
}: {
  count: number;
  active: number;
  onPick: (index: number) => void;
}) {
  const start = Math.max(0, active - DOTS_AROUND);
  const end = Math.min(count, active + DOTS_AROUND + 1);
  const indexes = Array.from({ length: end - start }, (_, i) => start + i);

  return (
    <div
      className="absolute top-1/2 left-1.25 z-10 flex -translate-y-1/2 flex-col items-center gap-1.5"
      role="tablist"
      aria-label="릴 위치"
    >
      {indexes.map((index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-selected={index === active}
          aria-label={`${index + 1}번째 릴`}
          onClick={() => onPick(index)}
          className={`rounded-pill w-1 ${
            index === active ? "bg-accent h-3.5" : "bg-muted h-1"
          }`}
        />
      ))}
    </div>
  );
}
