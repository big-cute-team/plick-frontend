/**
 * 공용 인라인 SVG 아이콘 레지스트리.
 *
 * 토큰 색을 그대로 물려받도록 stroke/fill = `currentColor`.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const ReelsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
  </svg>
);

export const HeartIcon = ({
  filled,
  ...p
}: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7-4.4-9.2-9C1.3 8 3 4.5 6.4 4.5c2 0 3.2 1.2 3.6 2 .4-.8 1.6-2 3.6-2 3.4 0 5.1 3.5 3.6 6.5C19 15.6 12 20 12 20Z" />
  </svg>
);

export const CommentIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5h16v11H9l-4 4v-4H4z" />
  </svg>
);

export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <path d="M12 15V4M8 7l4-3 4 3" />
  </svg>
);

export const BookmarkIcon = ({
  filled,
  ...p
}: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M6 4h12v16l-6-4-6 4z" />
  </svg>
);

/**
 * 릴스 액션 레일 아이콘 — 피그마 D5(node 77-6) 벡터를 그대로 사용.
 *
 * viewBox·패스·선 굵기가 피그마 노드 원본(0.55 배율 프레임 기준 단위)이라
 * size로 확대해도 디자인과 동일 비율로 렌더된다.
 */

export const LikeIcon = ({
  filled,
  size = 28,
  ...p
}: IconProps & { filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 15.4 15.4"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M7.69998 13.475C4.49164 10.5875 1.60414 8.34166 1.60414 5.51832C1.60414 3.72166 3.01581 2.24582 4.81248 2.24582C5.96748 2.24582 6.99414 2.82332 7.69998 3.78582C8.40581 2.82332 9.43248 2.24582 10.5875 2.24582C12.3841 2.24582 13.7958 3.72166 13.7958 5.51832C13.7958 8.34166 10.9083 10.5875 7.69998 13.475Z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.21917}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChatIcon = ({ size = 27, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14.85 14.85"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M12.9937 7.425C12.9937 8.11567 12.8577 8.79958 12.5934 9.43768C12.3291 10.0758 11.9417 10.6556 11.4533 11.1439C10.9649 11.6323 10.3851 12.0197 9.74703 12.284C9.10893 12.5483 8.42502 12.6844 7.73435 12.6844C6.80623 12.6844 5.93998 12.4678 5.19748 12.0656L1.85623 12.9937L2.84623 10.0237C2.60107 9.335 2.50219 8.60271 2.55591 7.87361C2.60963 7.14451 2.81477 6.43461 3.15823 5.78924C3.50169 5.14386 3.97592 4.57718 4.55067 4.12536C5.12541 3.67354 5.78804 3.3465 6.49627 3.16513C7.20449 2.98375 7.94274 2.95202 8.66392 3.07196C9.38509 3.1919 10.0733 3.46088 10.6847 3.86172C11.2961 4.26256 11.8172 4.78647 12.2148 5.39999C12.6124 6.01352 12.8776 6.7032 12.9937 7.425Z"
      stroke="currentColor"
      strokeWidth={1.17563}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SendIcon = ({ size = 27, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14.85 14.85"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M13.3031 1.54688L6.68249 8.1675"
      stroke="currentColor"
      strokeWidth={1.17563}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.3031 1.54688L9.28123 13.3031L6.68248 8.1675L1.54685 5.56875L13.3031 1.54688Z"
      stroke="currentColor"
      strokeWidth={1.17563}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SaveIcon = ({
  filled,
  size = 27,
  ...p
}: IconProps & { filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14.85 14.85"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M11.7562 12.9937L7.42498 9.89999L3.09373 12.9937V3.09374C3.09373 2.76554 3.2241 2.45078 3.45618 2.2187C3.68826 1.98662 4.00302 1.85624 4.33123 1.85624H10.5187C10.8469 1.85624 11.1617 1.98662 11.3938 2.2187C11.6258 2.45078 11.7562 2.76554 11.7562 3.09374V12.9937Z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.17563}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BackIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 14A8 8 0 0 1 10 4a7 7 0 1 0 10 10Z" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </svg>
);
