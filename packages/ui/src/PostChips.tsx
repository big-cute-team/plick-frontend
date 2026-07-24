/** 루머 단계 — 도메인 `RumorStage`와 같은 리터럴(ui는 domain에 의존하지 않아 별도 선언). */
export type PostStage = "RUMOUR" | "IN_PROGRESS" | "CONFIRM" | "OFFICIAL";

/**
 * 단계 칩 표시 스펙(KAN-281) — RUMOUR=초록(accent) · IN_PROGRESS=노랑(warn) ·
 * OFFICIAL=파랑(info). 라벨·색은 표시 스펙이라 이 컴포넌트가 소유한다.
 * CONFIRM은 BE 예정 단계라 타입만 선반영 — 색 스펙이 나오기 전까지 accent를 빌려 쓴다 (KAN-299).
 */
const STAGE_CHIP: Record<PostStage, { label: string; classes: string }> = {
  RUMOUR: {
    label: "RUMOUR",
    classes: "bg-accent-tint border-accent-border text-accent",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    classes: "bg-warn-tint border-warn-border text-warn",
  },
  CONFIRM: {
    label: "CONFIRM",
    classes: "bg-accent-tint border-accent-border text-accent",
  },
  OFFICIAL: {
    label: "OFFICIAL",
    classes: "bg-info-tint border-info-border text-info",
  },
};

/**
 * 게시물 배지 줄 — 팀 칩 + (단계가 있을 때) 루머 단계 칩. 릴 카드·기사 세부 공용.
 *
 * 앱 중립적이라 `@plick/ui`에 두고, 팀 이름·루머 단계는 앱에서 레지스트리를 꺼내
 * primitive로 넘긴다(MediaThumb의 colorVar 전례).
 *
 * @param teamName - 팀 한글 표기 (예: 리버풀). 태그된 팀이 없는 게시물이 있어
 *   비워둘 수 있고, 그러면 팀 칩 없이 나머지만 그린다.
 * @param stage - 루머 단계. 없으면(null/undefined) 단계 칩을 생략한다.
 * @param tone - 놓이는 바탕. `media`(기본): 사진 위 흰색 계열 · `surface`: 페이지
 *   배경 위 서피스 색(기사 세부). 사진 위 칩이 살짝 더 도톰하다(py 차이).
 */
export function PostChips({
  teamName,
  stage,
  tone = "media",
}: {
  teamName?: string | null;
  stage?: PostStage | null;
  tone?: "media" | "surface";
}) {
  const media = tone === "media";
  const pad = media ? "px-3 py-1.5" : "px-3 py-1";
  const stageChip = stage ? STAGE_CHIP[stage] : null;
  return (
    <div className="flex items-center gap-2">
      {teamName && (
        <span
          className={`text-caption rounded-pill tracking-label border font-extrabold ${pad} ${
            media
              ? "bg-media-chip border-media-chip-border text-media-on"
              : "bg-elevate border-border text-text"
          }`}
        >
          {teamName}
        </span>
      )}
      {stageChip && (
        <span
          className={`text-caption rounded-pill tracking-label border font-extrabold whitespace-nowrap ${pad} ${stageChip.classes}`}
        >
          {stageChip.label}
        </span>
      )}
    </div>
  );
}
