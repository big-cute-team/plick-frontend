import Link from "next/link";
import { playerProfilePath } from "@plick/domain/format";
import type { ReactNode } from "react";

/**
 * 선수 이름을 선수 프로필로 보내는 링크 (KAN-599 링크 규칙). API 선수 id가 null이면
 * 링크 없이 평범한 `<span>`이다. 이름 매칭으로 대상을 추측하지 않는다.
 *
 * @param playerId API-Football 선수 id
 * @param className 링크와 span 공통 클래스
 */
export function PlayerLink({
  playerId,
  className = "",
  children,
}: {
  playerId: number | null;
  className?: string;
  children: ReactNode;
}) {
  if (playerId === null) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={playerProfilePath(playerId)} className={className}>
      {children}
    </Link>
  );
}
