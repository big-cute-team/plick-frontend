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

/**
 * 릴 세부 시트 아이콘 — 피그마 V2 기사 세부(node 75-6) 벡터를 그대로 사용.
 *
 * viewBox·패스·선 굵기가 피그마 노드 원본(0.55 배율 프레임 기준 단위)이라
 * size로 확대해도 디자인과 동일 비율로 렌더된다.
 */

export const CloseIcon = ({ size = 18, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 9.9 9.9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M2.47499 2.47501L7.42499 7.42501"
      stroke="currentColor"
      strokeWidth={0.825}
      strokeLinecap="round"
    />
    <path
      d="M7.42499 2.47501L2.47499 7.42501"
      stroke="currentColor"
      strokeWidth={0.825}
      strokeLinecap="round"
    />
  </svg>
);

export const LinkOutIcon = ({ size = 13, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 7.15 7.15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M4.17088 1.19167H5.95838V2.97917"
      stroke="currentColor"
      strokeWidth={0.655417}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.95834 1.19167L2.97917 4.17084"
      stroke="currentColor"
      strokeWidth={0.655417}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.95838 4.02188V5.66042C5.95838 5.77894 5.9113 5.8926 5.82749 5.97641C5.74369 6.06022 5.63002 6.1073 5.51151 6.1073H1.48963C1.37111 6.1073 1.25745 6.06022 1.17364 5.97641C1.08984 5.8926 1.04276 5.77894 1.04276 5.66042V1.63855C1.04276 1.52003 1.08984 1.40636 1.17364 1.32256C1.25745 1.23875 1.37111 1.19167 1.48963 1.19167H3.12817"
      stroke="currentColor"
      strokeWidth={0.655417}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HeartMiniIcon = ({
  filled,
  size = 13,
  ...p
}: IconProps & { filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 7.15 7.15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M3.57504 6.25625C2.08545 4.91562 0.744827 3.87291 0.744827 2.56208C0.744827 1.72791 1.40024 1.0427 2.23441 1.0427C2.77066 1.0427 3.24733 1.31083 3.57504 1.7577C3.90274 1.31083 4.37941 1.0427 4.91566 1.0427C5.74983 1.0427 6.40524 1.72791 6.40524 2.56208C6.40524 3.87291 5.06462 4.91562 3.57504 6.25625Z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={0.595833}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SendMiniIcon = ({ size = 17, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 9.35 9.35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M8.37603 0.973947L4.20749 5.14249"
      stroke="currentColor"
      strokeWidth={0.857083}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.37604 0.973947L5.84375 8.37603L4.2075 5.14249L0.973956 3.50624L8.37604 0.973947Z"
      stroke="currentColor"
      strokeWidth={0.857083}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 데스크톱 웹 GNB 아이콘 — 피그마 W1 홈(node 203-2) 벡터를 그대로 사용.
 *
 * viewBox·패스·선 굵기가 피그마 노드 원본(0.45 배율 프레임 기준 단위)이라
 * size로 확대해도 디자인과 동일 비율로 렌더된다.
 */

export const SearchLineIcon = ({ size = 16, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 7.2 7.2"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M3.30012 5.39999C4.45992 5.39999 5.40012 4.45979 5.40012 3.29999C5.40012 2.14019 4.45992 1.19999 3.30012 1.19999C2.14032 1.19999 1.20012 2.14019 1.20012 3.29999C1.20012 4.45979 2.14032 5.39999 3.30012 5.39999Z"
      stroke="currentColor"
      strokeWidth={0.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.0002 5.99995L4.9502 4.94995"
      stroke="currentColor"
      strokeWidth={0.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SunLineIcon = ({ size = 20, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 9 9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M4.5 6.1876C5.43198 6.1876 6.1875 5.43208 6.1875 4.5001C6.1875 3.56812 5.43198 2.8126 4.5 2.8126C3.56802 2.8126 2.8125 3.56812 2.8125 4.5001C2.8125 5.43208 3.56802 6.1876 4.5 6.1876Z"
      stroke="currentColor"
      strokeWidth={0.675}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 0.937561V1.76256M4.5 7.23756V8.06256M0.937573 4.5001H1.76257M7.23757 4.5001H8.06257M1.87493 1.87513L2.47493 2.47513M6.525 6.5251L7.125 7.1251M7.125 1.87513L6.525 2.47513M2.47493 6.5251L1.87493 7.1251"
      stroke="currentColor"
      strokeWidth={0.675}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * MY 화면 아이콘 — 피그마 M1 마이페이지(node 26-6) 벡터를 그대로 사용.
 *
 * viewBox·패스·선 굵기가 피그마 노드 원본(0.55 배율 프레임 기준 단위)이라
 * size로 확대해도 디자인과 동일 비율로 렌더된다.
 */

export const UserRoundIcon = ({ size = 26, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14.3 14.3"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M7.15001 7.15001C8.46629 7.15001 9.53334 6.08295 9.53334 4.76667C9.53334 3.45039 8.46629 2.38334 7.15001 2.38334C5.83373 2.38334 4.76668 3.45039 4.76668 4.76667C4.76668 6.08295 5.83373 7.15001 7.15001 7.15001Z"
      stroke="currentColor"
      strokeWidth={1.19167}
      strokeLinecap="round"
    />
    <path
      d="M2.38332 12.5125C3.27707 10.4271 5.06457 9.53334 7.14999 9.53334C9.23541 9.53334 11.0229 10.4271 11.9167 12.5125"
      stroke="currentColor"
      strokeWidth={1.19167}
      strokeLinecap="round"
    />
  </svg>
);

export const TeamShieldIcon = ({ size = 19, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10.45 10.45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M5.225 1.30625L8.27292 2.6125V4.78959C8.27292 6.7925 7.01021 8.31646 5.225 9.14375C3.43979 8.31646 2.17708 6.7925 2.17708 4.78959V2.6125L5.225 1.30625Z"
      stroke="currentColor"
      strokeWidth={0.78375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BellLineIcon = ({ size = 19, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10.45 10.45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M7.83751 3.48334C7.83751 2.79046 7.56227 2.12596 7.07233 1.63602C6.58239 1.14608 5.91789 0.870839 5.22501 0.870839C4.53213 0.870839 3.86763 1.14608 3.3777 1.63602C2.88776 2.12596 2.61251 2.79046 2.61251 3.48334C2.61251 6.53126 1.30626 7.40209 1.30626 7.40209H9.14376C9.14376 7.40209 7.83751 6.53126 7.83751 3.48334Z"
      stroke="currentColor"
      strokeWidth={0.78375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.96522 9.14375C5.88713 9.26977 5.77815 9.37376 5.64861 9.44588C5.51908 9.51799 5.37327 9.55584 5.22502 9.55584C5.07676 9.55584 4.93096 9.51799 4.80142 9.44588C4.67189 9.37376 4.56291 9.26977 4.48481 9.14375"
      stroke="currentColor"
      strokeWidth={0.78375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MoonLineIcon = ({ size = 19, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10.45 10.45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M8.92607 6.31356C8.25685 6.57336 7.52651 6.63293 6.82403 6.485C6.12155 6.33708 5.47725 5.98804 4.96963 5.48042C4.46201 4.9728 4.11297 4.3285 3.96504 3.62602C3.81712 2.92354 3.87668 2.1932 4.13649 1.52398C3.56257 1.74678 3.05329 2.10924 2.65479 2.57852C2.25629 3.0478 1.98114 3.60907 1.85428 4.21152C1.72742 4.81396 1.75285 5.43853 1.92826 6.02866C2.10368 6.61879 2.42353 7.15585 2.85887 7.59118C3.2942 8.02651 3.83125 8.34637 4.42139 8.52178C5.01152 8.6972 5.63609 8.72262 6.23853 8.59576C6.84097 8.4689 7.40225 8.19376 7.87153 7.79526C8.34081 7.39676 8.70327 6.88748 8.92607 6.31356Z"
      stroke="currentColor"
      strokeWidth={0.78375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HelpCircleIcon = ({ size = 19, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10.45 10.45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M5.22501 9.14374C7.38928 9.14374 9.14376 7.38926 9.14376 5.22499C9.14376 3.06073 7.38928 1.30624 5.22501 1.30624C3.06075 1.30624 1.30626 3.06073 1.30626 5.22499C1.30626 7.38926 3.06075 9.14374 5.22501 9.14374Z"
      stroke="currentColor"
      strokeWidth={0.78375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.00584 3.91875C4.10853 3.65959 4.29693 3.44345 4.53965 3.30635C4.78236 3.16924 5.06473 3.11946 5.3397 3.16529C5.61467 3.21112 5.86563 3.34979 6.05076 3.5582C6.23589 3.76661 6.344 4.03217 6.35709 4.31062C6.35709 5.09437 5.22501 5.225 5.22501 5.87812"
      stroke="currentColor"
      strokeWidth={0.78375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.22501 7.40207H5.22937"
      stroke="currentColor"
      strokeWidth={0.78375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LogoutIcon = ({ size = 17, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 9.35 9.35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M3.50625 8.18126H1.94792C1.74127 8.18126 1.54308 8.09917 1.39696 7.95305C1.25084 7.80693 1.16875 7.60874 1.16875 7.4021V1.94793C1.16875 1.74128 1.25084 1.5431 1.39696 1.39697C1.54308 1.25085 1.74127 1.16876 1.94792 1.16876H3.50625"
      stroke="currentColor"
      strokeWidth={0.779167}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.23332 6.62292L8.18124 4.675L6.23332 2.72708"
      stroke="currentColor"
      strokeWidth={0.779167}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.18125 4.67501H3.50625"
      stroke="currentColor"
      strokeWidth={0.779167}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronMiniIcon = ({ size = 17, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 9.35 9.35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M3.50623 2.33749L5.84373 4.67499L3.50623 7.01249"
      stroke="currentColor"
      strokeWidth={0.857083}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 프로필 수정 화면 아이콘 — 피그마 M2(node 25-6) 벡터를 그대로 사용.
 *
 * viewBox·패스·선 굵기가 피그마 노드 원본(0.55 배율 프레임 기준 단위)이라
 * size로 확대해도 디자인과 동일 비율로 렌더된다.
 */

export const ArrowLeftIcon = ({ size = 20, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 11 11"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M8.70829 5.5H2.29163"
      stroke="currentColor"
      strokeWidth={0.916667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.04163 8.25L2.29163 5.5L5.04163 2.75"
      stroke="currentColor"
      strokeWidth={0.916667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CameraIcon = ({ size = 14, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 7.7 7.7"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M4.65214 1.28333H3.04797L2.40631 2.24583H1.28339C1.11321 2.24583 0.949999 2.31343 0.829663 2.43376C0.709328 2.5541 0.641724 2.71731 0.641724 2.88749V5.77499C0.641724 5.94517 0.709328 6.10838 0.829663 6.22872C0.949999 6.34905 1.11321 6.41666 1.28339 6.41666H6.41672C6.5869 6.41666 6.75011 6.34905 6.87045 6.22872C6.99079 6.10838 7.05839 5.94517 7.05839 5.77499V2.88749C7.05839 2.71731 6.99079 2.5541 6.87045 2.43376C6.75011 2.31343 6.5869 2.24583 6.41672 2.24583H5.29381L4.65214 1.28333Z"
      stroke="currentColor"
      strokeWidth={0.641667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.85007 5.13334C4.38165 5.13334 4.81257 4.70242 4.81257 4.17084C4.81257 3.63927 4.38165 3.20834 3.85007 3.20834C3.3185 3.20834 2.88757 3.63927 2.88757 4.17084C2.88757 4.70242 3.3185 5.13334 3.85007 5.13334Z"
      stroke="currentColor"
      strokeWidth={0.641667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 온보딩 아이콘 — 피그마 A5 닉네임 설정(node 96-6) 벡터를 그대로 사용.
 *
 * viewBox·패스·선 굵기가 피그마 노드 원본(0.55 배율 프레임 기준 단위)이라
 * size로 확대해도 디자인과 동일 비율로 렌더된다.
 */

export const CheckIcon = ({ size = 14, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 7.7 7.7"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M6.41664 1.92501L2.88748 5.45417L1.28331 3.85001"
      stroke="currentColor"
      strokeWidth={0.802083}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 소셜 브랜드 아이콘 — 로그인(A1, 105-6)·회원가입(A2, 104-6) 공용. 피그마 노드 벡터 그대로.
 * viewBox 10.45는 피그마 0.55 스케일 원본(실측 19px 렌더)이다.
 */

/**
 * 카카오 말풍선 심볼. 색은 `currentColor`로 버튼 글자색(on-kakao)을 따른다.
 *
 * @param size - 렌더 크기(px)
 */
export const KakaoIcon = ({ size = 19, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10.45 10.45"
    fill="none"
    aria-hidden
    {...p}
  >
    <path
      d="M5.225 1.30627C2.8215 1.30627 0.870834 2.84764 0.870834 4.74606C0.870834 5.96522 1.68071 7.03199 2.89117 7.64158C2.80408 7.96814 2.56896 8.83027 2.52106 9.01314C2.46446 9.23956 2.60379 9.2352 2.69523 9.17424C2.76925 9.12635 3.83602 8.3992 4.29756 8.0857C4.59365 8.12924 4.90279 8.15537 5.225 8.15537C7.6285 8.15537 9.57917 6.61399 9.57917 4.74606C9.57917 2.87812 7.6285 1.30627 5.225 1.30627Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * 구글 G 심볼. 4색은 구글 고정 브랜드 컬러라 테마 토큰으로 치환하지 않는다.
 *
 * @param size - 렌더 크기(px)
 */
export const GoogleIcon = ({ size = 19, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10.45 10.45"
    fill="none"
    aria-hidden
    {...p}
  >
    <path
      d="M5.22496 2.06824C5.99565 2.06824 6.68578 2.33385 7.23005 2.85199L8.72136 1.36069C7.81569 0.518161 6.63353 1.52588e-05 5.22496 1.52588e-05C3.18286 1.52588e-05 1.41724 1.17129 0.557294 2.87812L2.29461 4.22573C2.70607 2.98697 3.86211 2.06824 5.22496 2.06824Z"
      fill="#EA4335"
    />
    <path
      d="M10.2279 5.34477C10.2279 5.00296 10.1953 4.67205 10.1452 4.35419H5.22498V6.31792H8.04212C7.91585 6.96234 7.5501 7.51096 7.00148 7.88107L8.68436 9.18732C9.66623 8.2773 10.2279 6.93186 10.2279 5.34477Z"
      fill="#4285F4"
    />
    <path
      d="M2.29244 6.22429C2.18794 5.90862 2.12699 5.57335 2.12699 5.22501C2.12699 4.87668 2.18577 4.54141 2.29244 4.22573L0.555132 2.87812C0.200267 3.58349 -2.44141e-05 4.3803 -2.44141e-05 5.22501C-2.44141e-05 6.06972 0.200267 6.86653 0.557309 7.57191L2.29244 6.22429Z"
      fill="#FBBC05"
    />
    <path
      d="M5.22499 10.45C6.63574 10.45 7.82225 9.9863 8.68438 9.18514L7.00149 7.87889C6.53342 8.19456 5.93036 8.37962 5.22499 8.37962C3.86214 8.37962 2.7061 7.46089 2.29246 6.22213L0.555145 7.56974C1.41727 9.27875 3.18289 10.45 5.22499 10.45Z"
      fill="#34A853"
    />
  </svg>
);
