import Link from "next/link";
import { formatCount } from "@plick/domain/format";
import { ChevronMiniIcon, LikeIcon } from "@plick/ui/icons";
import { ACTIVITY_TABS } from "@/_constants/activity";
import type { MyActivityCounts } from "@/_types/activity";
import { activityTabPath } from "@/_utils/activity";

/**
 * MY 활동 카드 (KAN-495). 좋아요한 기사 수와 내가 쓴 댓글 수를 타일 둘로 보여주고,
 * 타일을 누르면 활동 화면의 그 탭으로 들어간다.
 *
 * 목록을 마이페이지에 직접 펼치지 않고 한 단계 아래 화면으로 뺐다. 마이페이지는
 * 설정 줄·로그아웃까지 한 화면에 있는데, 무한스크롤 목록을 그 사이에 두면
 * 아래 항목에 영영 닿지 못한다. 숫자는 여기 두어 "쌓였다"는 감각과 진입
 * 이유를 준다(티켓의 "상단에 활동 개수").
 *
 * 응원팀 카드(`FavoriteTeamsCard`)와 같은 섀시다. 개수 조회가 실패하면 숫자
 * 없이 타일만 그린다. 진입은 돼야 하고 숫자는 활동 화면이 다시 센다.
 *
 * @param counts 활동 개수. 조회 실패면 null
 */
export function ActivityCard({ counts }: { counts: MyActivityCounts | null }) {
  return (
    <section className="bg-elevate-2 border-border rounded-card border p-4">
      <div className="gap-gap flex items-center">
        <span className="bg-elevate rounded-tile text-icon grid size-8 shrink-0 place-items-center">
          <LikeIcon size={18} />
        </span>
        <span className="text-body text-text min-w-0 flex-1 font-bold">
          내 활동
        </span>
        <Link
          href={activityTabPath("likes")}
          className="text-label text-accent flex shrink-0 items-center gap-0.5 font-semibold active:opacity-60"
        >
          전체 보기
          <ChevronMiniIcon size={13} />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {ACTIVITY_TABS.map(({ key, label }) => {
          const count =
            counts &&
            (key === "likes" ? counts.likeCount : counts.commentCount);
          return (
            <Link
              key={key}
              href={activityTabPath(key)}
              className="bg-elevate rounded-control flex flex-col gap-1 px-3.5 py-3 active:opacity-60"
            >
              <span className="text-caption text-text-4 font-semibold">
                {label}
              </span>
              {count !== null && (
                <span className="text-title text-text font-extrabold tracking-tight">
                  {formatCount(count)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
