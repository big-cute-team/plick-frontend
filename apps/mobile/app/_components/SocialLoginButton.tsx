import type { ReactNode } from "react";

/**
 * 소셜 인증 pill 버튼 — 아이콘 + 라벨을 중앙 정렬한 풀폭 버튼. 로그인·회원가입 공용.
 *
 * 높이·배경·테두리 등 프로바이더별 차이는 `className`으로 받는다
 * (카카오: `h-13 bg-kakao`, 구글: 테두리 포함 `h-13.5 bg-media-on border-border-strong border`).
 *
 * @param icon - 좌측 브랜드 아이콘
 * @param label - 버튼 문구
 * @param className - 프로바이더별 높이/배경/테두리 토큰 유틸
 */
export function SocialLoginButton({
  icon,
  label,
  className,
}: {
  icon: ReactNode;
  label: string;
  className: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-pill text-on-kakao flex w-full items-center justify-center gap-2.5 active:opacity-60 ${className}`}
    >
      {icon}
      <span className="text-body-lg font-bold">{label}</span>
    </button>
  );
}
