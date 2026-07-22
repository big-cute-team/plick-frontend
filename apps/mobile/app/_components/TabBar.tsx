"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/_constants/app";

/**
 * 하단 탭 내비게이션.
 *
 * pb에 `safe-area-inset-bottom`을 더해 홈 인디케이터/제스처 영역을 피한다.
 *
 * @param variant - `"solid"`(기본): bg-nav 배경 + 상단 보더.
 *   `"overlay"`: 릴스처럼 미디어 위에 얹는 그라데이션 스크림 탭(비활성은 흰색 dim).
 */
export function TabBar({
  variant = "solid",
}: {
  variant?: "solid" | "overlay";
}) {
  const pathname = usePathname();
  const overlay = variant === "overlay";
  return (
    <nav
      className={
        overlay
          ? "absolute inset-x-0 bottom-0 z-10"
          : "border-border bg-nav/95 shrink-0 border-t backdrop-blur-md"
      }
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        // 스크림은 이미지 가독성용 고정 값(테마 무관)
        ...(overlay && {
          backgroundImage:
            "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--plk-scrim) 90%, transparent) 45%)",
        }),
      }}
    >
      <ul className="flex h-14 items-stretch">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-1 ${
                  active
                    ? "text-accent"
                    : overlay
                      ? "text-media-on-dim opacity-85"
                      : "text-text-4"
                } active:opacity-60`}
              >
                <Icon size={22} />
                <span className="text-micro font-bold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
