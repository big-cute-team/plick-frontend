import Link from "next/link";
import type { ReactNode } from "react";
import { playerProfilePath } from "@plick/domain/format";

/**
 * 선수 프로필로 보내는 링크 (KAN-604, 웹 `PlayerLink`와 같은 규칙). API 선수 id가 null이면
 * 프로필 라우트가 없어 링크가 아니라 평범한 `<span>`으로 떨어진다. 이름 매칭으로 id를
 * 추측하지 않는다.
 *
 * @param playerId API-Football 선수 id. null이면 링크 없음
 * @param className 링크와 span 공통 클래스
 * @param children 사진, 이름 등
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
