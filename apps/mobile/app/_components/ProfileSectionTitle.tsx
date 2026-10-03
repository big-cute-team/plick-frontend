import type { ReactNode } from "react";

/**
 * 프로필 섹션 제목 (KAN-567, 시안 프로필). 15/900 -.025em, 위 24 아래 6이다.
 * 팀·인물 프로필의 선수단, 관련 이슈, 기본 정보가 쓴다.
 *
 * @param children 제목 글자
 */
export function ProfileSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-body-lg tracking-section text-text-strong pt-6 pb-1.5 font-black">
      {children}
    </h2>
  );
}
