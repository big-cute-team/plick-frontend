import Link from "next/link";
import { ACTIVITY_TABS, activityTabPath } from "@/_constants/me";
import type { ActivityTab } from "@/_types/activity";

/**
 * 내 활동 탭 줄 (KAN-567 시안 MY 603-607행) — 내 댓글, 좋아요, 내 투표. 탭의 원본은
 * URL `?tab=`이라 링크로 그린다. 활성 탭은 700 제목색에 강조색 2px 밑줄이다.
 *
 * @param active 지금 탭
 */
export function ActivityTabs({ active }: { active: ActivityTab }) {
  return (
    <div
      role="tablist"
      aria-label="내 활동"
      className="border-border flex items-center gap-4.5 border-b"
    >
      {ACTIVITY_TABS.map(({ key, label }) => {
        const on = key === active;
        return (
          <Link
            key={key}
            href={activityTabPath(key)}
            role="tab"
            aria-selected={on}
            className={`text-body focus-visible:outline-accent -mb-px border-b-2 pb-2.25 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              on
                ? "border-accent text-text-strong font-bold"
                : "hover:text-text-strong text-text-3 border-transparent font-medium"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
