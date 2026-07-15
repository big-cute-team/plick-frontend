import Link from "next/link";
import { ArrowLeftIcon } from "@plick/ui/icons";

/**
 * 공용 뒤로가기 버튼 — 상단바 좌측에 놓는 아이콘 링크.
 *
 * 히스토리 back이 아니라 명시적 목적지로 이동한다(딥링크 진입 시에도 동선 보장).
 *
 * @param href - 뒤로가기 목적지
 */
export function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="뒤로"
      className="text-icon -ml-1.5 grid size-9 place-items-center active:opacity-60"
    >
      <ArrowLeftIcon size={20} />
    </Link>
  );
}
