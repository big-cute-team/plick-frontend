import type { ReactNode } from "react";

/**
 * 프로필 우측 레일 카드 (시안 팀 프로필 1395행~). 웹에서 테두리를 두르는 곳은 레일뿐이다.
 * 머리 38px에 제목 13/900, 아래 구분선.
 *
 * @param title 카드 제목
 */
export function RailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border-strong border">
      <div className="border-border flex h-9.5 items-center border-b px-3.5">
        <h2 className="text-body text-text-strong font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}
