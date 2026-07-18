/**
 * 게시물 배지 줄 — 팀 칩 + (루머 단계일 때) RUMOUR 칩. 릴 카드·기사 세부 공용.
 *
 * 앱 중립적이라 `@plick/ui`에 두고, 팀 이름·루머 여부는 앱에서 레지스트리를 꺼내
 * primitive로 넘긴다(MediaThumb의 colorVar 전례).
 *
 * @param teamName - 팀 한글 표기 (예: 리버풀)
 * @param rumour - 루머 단계이면 RUMOUR 칩을 함께 표시
 * @param tone - 놓이는 바탕. `media`(기본): 사진 위 흰색 계열 · `surface`: 페이지
 *   배경 위 서피스 색(기사 세부). 사진 위 칩이 살짝 더 도톰하다(py 차이).
 */
export function PostChips({
  teamName,
  rumour,
  tone = "media",
}: {
  teamName: string;
  rumour: boolean;
  tone?: "media" | "surface";
}) {
  const media = tone === "media";
  const pad = media ? "px-3 py-1.5" : "px-3 py-1";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-caption rounded-pill tracking-label border font-extrabold ${pad} ${
          media
            ? "bg-media-chip border-media-chip-border text-media-on"
            : "bg-elevate border-border text-text"
        }`}
      >
        {teamName}
      </span>
      {rumour && (
        <span
          className={`bg-accent-tint border-accent-border text-accent text-caption rounded-pill tracking-label border font-extrabold ${pad}`}
        >
          RUMOUR
        </span>
      )}
    </div>
  );
}
