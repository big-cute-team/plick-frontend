import Link from "next/link";
import { ChevronRightIcon } from "@plick/ui/icons";

/**
 * MY의 진입 행 (KAN-567, 시안 계정·차단 목록 행). 높이 50, 왼쪽 라벨 14/700,
 * 오른쪽에 보조 값(이메일·N명)과 꺾쇠. 위아래 선은 호출부가 준다. 첫 행 위는
 * 섹션 선, 행 사이는 목록 선, 마지막 행 아래는 섹션 선이라 행마다 다르다.
 *
 * @param href 이동할 경로
 * @param label 행 제목
 * @param value 오른쪽 보조 값. 없으면 꺾쇠만
 * @param className 테두리 등 호출부 보정
 */
export function MeLinkRow({
  href,
  label,
  value,
  className = "",
}: {
  href: string;
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex h-12.5 items-center gap-2 active:opacity-60 ${className}`}
    >
      <span className="text-body-md text-text-strong min-w-0 flex-1 font-bold">
        {label}
      </span>
      {value && (
        <span className="text-label-lg text-text-4 truncate">{value}</span>
      )}
      <ChevronRightIcon size={16} className="text-text-4 shrink-0" />
    </Link>
  );
}
