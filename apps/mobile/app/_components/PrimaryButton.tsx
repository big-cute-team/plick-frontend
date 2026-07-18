import type { ReactNode } from "react";
import Link from "next/link";

/**
 * 주요 CTA — accent 알약 버튼. 온보딩 "다음/시작하기"·프로필 저장 공용.
 *
 * @param href - 있으면 Link로, 없으면 button으로 렌더한다
 */
export function PrimaryButton({
  href,
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  const cls =
    "bg-accent text-on-accent rounded-pill text-body-lg flex h-13 w-full items-center justify-center font-extrabold active:opacity-90";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls}>
      {children}
    </button>
  );
}
