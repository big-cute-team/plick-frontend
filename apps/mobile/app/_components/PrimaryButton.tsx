import type { ReactNode } from "react";
import Link from "next/link";

/**
 * 주요 CTA. accent로 채운 rounded-control 버튼, 높이 48 (KAN-567 시안의 확정
 * 행동 버튼). 온보딩 "다음/시작하기", 계정 저장, 404·에러 화면이 공용한다.
 *
 * @param href 있으면 Link로, 없으면 button으로 렌더한다
 * @param onClick button 렌더일 때의 클릭 핸들러 (제출 등)
 * @param disabled button 렌더일 때 비활성화 (제출 중·입력 미완)
 */
export function PrimaryButton({
  href,
  onClick,
  disabled,
  children,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const cls =
    "bg-accent text-on-accent rounded-control text-body-md flex h-12 w-full items-center justify-center font-bold active:opacity-80 disabled:opacity-40";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
