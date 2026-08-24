import type { ReactNode } from "react";

/**
 * 소셜 인증 pill 버튼 — 아이콘 + 라벨을 중앙 정렬한 풀폭 버튼. 로그인·회원가입 공용(웹·모바일).
 *
 * 높이·배경·테두리·글자색 등 프로바이더별 차이는 `className`으로 받는다
 * (카카오: `h-13 bg-kakao text-on-kakao`, 구글: 테두리 포함 `h-13.5 bg-media-on
 * border-border-strong border text-on-kakao`, 애플: `h-13 bg-apple text-on-apple`).
 * hover는 `@media(hover:hover)`라 데스크톱에서만 반응하고 모바일 터치엔 영향이 없다.
 *
 * @param icon - 좌측 브랜드 아이콘
 * @param label - 버튼 문구
 * @param className - 프로바이더별 높이/배경/테두리/글자색 토큰 유틸
 * @param onClick - 클릭 핸들러 (앱이 로그인 액션을 연결)
 * @param disabled - 진행 중 등 비활성 상태
 */
export function SocialLoginButton({
  icon,
  label,
  className,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  className: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-pill focus-visible:ring-accent focus-visible:ring-offset-bg flex w-full items-center justify-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:opacity-60 disabled:opacity-40 ${className}`}
    >
      {icon}
      <span className="text-body-lg font-bold">{label}</span>
    </button>
  );
}
