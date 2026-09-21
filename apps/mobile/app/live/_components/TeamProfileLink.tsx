import Link from "next/link";
import { teamProfilePath } from "@plick/domain/format";
import type { LiveTeam } from "@plick/domain/live";
import type { ReactNode } from "react";

/**
 * 라이브 화면에서 팀 표식(크레스트·팀명)을 팀 프로필로 보내는 링크 (KAN-484).
 *
 * "라이브 어디서든 팀을 누르면 그 팀 화면으로" 가야 한다는 요구인데, 경기 헤더·
 * 순위표·프리뷰 블록이 저마다 조건 분기를 들고 있으면 한 군데씩 빠진다. 판정을
 * 여기 한 곳에 모은다.
 *
 * 빅6 밖 팀은 `code`가 없어 프로필 라우트 자체가 없다 — 그때는 링크가 아니라
 * 평범한 `<span>`으로 떨어져서 누를 수 있는 것처럼 보이지 않는다.
 *
 * 앵커 안에 앵커를 넣을 수 없으므로 이미 링크 안에 있는 자리(경기 목록 카드처럼
 * 카드 전체가 상세로 가는 곳)에는 쓰지 않는다.
 *
 * @param team 팀 참조
 * @param className 링크·span 공통 클래스
 * @param children 크레스트와 팀명
 */
export function TeamProfileLink({
  team,
  className = "",
  children,
}: {
  team: LiveTeam;
  className?: string;
  children: ReactNode;
}) {
  if (team.code === null) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      href={teamProfilePath(team.code)}
      aria-label={`${team.name} 팀 프로필`}
      className={className}
    >
      {children}
    </Link>
  );
}
