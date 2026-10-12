import type { ReactNode } from "react";

/**
 * 프로필 본문 섹션 (KAN-604, 시안 프로필 공통). 제목 15/900, 위 여백 26이고 오른쪽에
 * 보조 글(시즌 표기)이나 액션(대회 선택, 범례)을 붙일 수 있다. 팀, 선수 프로필의 탭
 * 본문이 같이 쓴다.
 *
 * @param title 섹션 제목
 * @param note 제목 옆 보조 글
 * @param action 제목 줄 오른쪽 끝
 * @param children 본문
 */
export function ProfileSection({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="pt-6.5">
      <div className="flex items-baseline gap-2 pb-2">
        <h2 className="text-body-lg tracking-section text-text-strong font-black">
          {title}
        </h2>
        {note && <span className="text-caption text-text-4">{note}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}
