import { TEAMS } from "@/_lib/constants";
import type { FeedPost } from "@/_lib/types";

/**
 * 릴 미디어 위 배지 줄 — 팀 칩 + (루머 단계일 때) RUMOUR 칩.
 *
 * 사진 위에 얹는 요소라 media 계열 토큰(테마 무관 흰색 계열)을 쓴다.
 * ReelItem(릴 본편) 전용 — 세부 시트가 열려도 릴의 칩·제목 요소가
 * 그대로 시트 라인 위로 떠올라 새로 그리지 않는다.
 */
export function PostChips({ post }: { post: FeedPost }) {
  const team = TEAMS[post.team];
  return (
    <div className="flex items-center gap-2">
      <span className="bg-media-chip border-media-chip-border text-media-on text-caption rounded-pill border px-3 py-1.5 font-extrabold tracking-wide">
        {team.name}
      </span>
      {post.stage === "RUMOUR" && (
        <span className="bg-accent-tint border-accent-border text-accent text-caption rounded-pill tracking-label border px-3 py-1.5 font-extrabold">
          RUMOUR
        </span>
      )}
    </div>
  );
}
