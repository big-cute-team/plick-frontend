import { RESULT_LABEL, type MatchResult } from "@plick/domain/team-profile";

/**
 * 경기 결과 칸 (KAN-604, 시안 프로필). 승은 강조색 면에 흰 글자, 무는 `muted` 면, 패는
 * 흐린 면에 보조색 글자다. 회색 숫자 상자 위(최근 5경기)에서는 패 칸만 흰 면으로 띄운다.
 *
 * @param result 이 팀 기준 결과
 * @param size 숫자 상자는 lg(24px), 경기 행은 md(22px)
 */
export function ResultChip({
  result,
  size = "md",
}: {
  result: MatchResult;
  size?: "md" | "lg";
}) {
  const tone =
    result === "W"
      ? "bg-accent text-on-accent"
      : result === "D"
        ? "bg-muted text-text"
        : size === "lg"
          ? "bg-bg text-text-3"
          : "bg-form-loss text-text-3";
  return (
    <span
      className={`${tone} ${size === "lg" ? "size-6" : "size-5.5"} rounded-badge text-caption grid shrink-0 place-items-center font-black`}
    >
      {RESULT_LABEL[result]}
    </span>
  );
}
