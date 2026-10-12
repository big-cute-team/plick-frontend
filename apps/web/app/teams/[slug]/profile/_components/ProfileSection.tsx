import type { ReactNode } from "react";

/**
 * 프로필 본문 섹션 머리 (시안 팀 프로필 공통: 제목 15/900 + 옆 보조 11.5). 본문 섹션은
 * 테두리 없이 여백으로 끊는다.
 *
 * @param title 섹션 제목
 * @param note 제목 옆 보조 글자
 * @param action 오른쪽 끝에 붙일 요소(대회 선택 등)
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
    <section>
      <div className="flex items-baseline gap-2.25 pb-2">
        <h2 className="text-body-lg text-text-strong font-black tracking-tight">
          {title}
        </h2>
        {note && <span className="text-caption-lg text-text-3">{note}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}
