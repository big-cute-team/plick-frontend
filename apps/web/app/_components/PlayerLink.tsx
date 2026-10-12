import Link from "next/link";
import { playerProfilePath } from "@plick/domain/format";
import type { ReactNode } from "react";

/**
 * 선수 이름을 선수 프로필로 보내는 링크 (KAN-599 링크 규칙). API 선수 id가 null이면
 * 링크 없이 평범한 `<span>`이다. 이름 매칭으로 대상을 추측하지 않는다.
 *
 * @param playerId API-Football 선수 id
 * @param className 링크와 span 공통 클래스
 * @param linkClassName 링크일 때만 붙일 클래스(hover 색 등). 링크가 아닌 이름이 눌릴 것처럼 보이지 않게 한다
 */
export function PlayerLink({
  playerId,
  className = "",
  linkClassName = "",
  children,
}: {
  playerId: number | null;
  className?: string;
  linkClassName?: string;
  children: ReactNode;
}) {
  if (playerId === null) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      href={playerProfilePath(playerId)}
      className={`${className} ${linkClassName}`}
    >
      {children}
    </Link>
  );
}
