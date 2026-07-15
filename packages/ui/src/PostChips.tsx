/**
 * 미디어 위 배지 줄 — 팀 칩 + (루머 단계일 때) RUMOUR 칩. 릴 카드 공용.
 *
 * 사진 위에 얹는 요소라 media 계열 토큰(테마 무관 흰색 계열)을 쓴다. 앱 중립적이라
 * `@plick/ui`에 두고, 팀 이름·루머 여부는 앱에서 레지스트리를 꺼내 primitive로 넘긴다
 * (MediaThumb의 colorVar 전례).
 *
 * @param teamName - 팀 한글 표기 (예: 리버풀)
 * @param rumour - 루머 단계이면 RUMOUR 칩을 함께 표시
 */
export function PostChips({
  teamName,
  rumour,
}: {
  teamName: string;
  rumour: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-media-chip border-media-chip-border text-media-on text-caption rounded-pill border px-3 py-1.5 font-extrabold tracking-wide">
        {teamName}
      </span>
      {rumour && (
        <span className="bg-accent-tint border-accent-border text-accent text-caption rounded-pill tracking-label border px-3 py-1.5 font-extrabold">
          RUMOUR
        </span>
      )}
    </div>
  );
}
