/**
 * 투표가 붙은 이슈의 `VS` 표시 (KAN-567). 시안 규칙대로 빨간 글자(900, 자간 .06em)
 * 하나로만 알린다 — 칩·글로우·아이콘은 쓰지 않는다. 목록 행, 핫이슈 카드,
 * 기사·릴 머리, 프로필의 투표 목록이 같이 쓴다.
 *
 * @param size - `sm`은 목록 행(10px), `md`는 기사·릴 머리(10.5~11px)
 */
export function VsMark({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      aria-label="투표 진행"
      className={`text-danger tracking-vs shrink-0 leading-none font-black ${
        size === "sm" ? "text-micro" : "text-caption"
      }`}
    >
      VS
    </span>
  );
}
