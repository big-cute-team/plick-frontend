import type { ReactNode } from "react";

/**
 * 열린 토론을 알리는 번쩍이는 칩 (KAN-418, 시안 T2 — 워딩은 KAN-435에서 VS로).
 * 모바일·웹 릴이 같이 쓰고, 모바일 기사 리스트(KAN-438)도 label을 바꿔 단다.
 *
 * 이 게시물이 투표형이라는 유일한 신호라 틴트 배지들 사이에서 혼자
 * 튀도록 솔리드 그린 + 다크 글자로 뒤집었다(ADR 0108). 칩 전체가 accent
 * 글로우로 번쩍이고 점도 따로 깜빡여 진행 중임을 알린다 — 마감된 토론에는
 * 이 칩을 달지 않는다. `debate-live-chip` 키프레임은 각 앱 globals.css에
 * 있어야 한다(HotCarousel의 `snap-x-carousel`과 같은 규약).
 *
 * @param label 칩 문구. 릴은 기본값(VS 진행 중), 기사 리스트는 "VS".
 * @param icon 점 대신 앞에 붙일 아이콘 노드. 기사 리스트가 하단 탭과 같은
 *   VsIcon을 준다 — 그림 아이콘은 깜빡이면 지저분해서 점과 달리 pulse를
 *   걸지 않는다. currentColor라 칩 글자색을 그대로 따른다.
 * @param variant solid는 릴 위에서 혼자 튀는 솔리드 그린(ADR 0108), outline은
 *   기사 리스트용으로 배경 없이 accent 테두리·글자만 남긴 각진(badge 라운드)
 *   버전. 글로우 키프레임은 box-shadow라 배경이 없어도 똑같이 번쩍인다.
 */
export function DebateLiveChip({
  label = "VS 진행 중",
  icon,
  variant = "solid",
}: {
  label?: string;
  icon?: ReactNode;
  variant?: "solid" | "outline";
}) {
  const look =
    variant === "outline"
      ? "border-accent text-accent rounded-badge border bg-transparent"
      : "bg-accent text-on-accent rounded-pill";
  return (
    <span
      className={`debate-live-chip ${look} text-micro flex items-center gap-1 px-2 py-1 font-extrabold whitespace-nowrap`}
    >
      <span
        aria-hidden
        className={icon ? "leading-none" : "animate-pulse leading-none"}
      >
        {icon ?? "●"}
      </span>
      {label}
    </span>
  );
}
