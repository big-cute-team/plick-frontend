import { RESULT_LABEL, type MatchResult } from "@plick/domain/team-profile";

/**
 * 경기 결과 칸 (시안 팀 프로필). 승은 강조색 면에 흰 글자, 무는 `muted` 면, 패는 흐린 면에
 * 보조색 글자다. 숫자 띠 위에서는 바탕이 회색이라 패 칸만 흰 면으로 띄운다.
 *
 * @param result 이 팀 기준 결과
 * @param size 숫자 띠는 lg(26px), 경기 행은 md(24px)
 */
export function ResultBox({
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
      className={`${tone} ${size === "lg" ? "text-label size-6.5" : "text-caption-lg size-6"} grid shrink-0 place-items-center font-black`}
    >
      {RESULT_LABEL[result]}
    </span>
  );
}
