import Link from "next/link";

/**
 * 프로필 "기본 정보" 행 (KAN-567, 시안 프로필). 라벨 64px 12.5 회색 + 값 13.5를
 * 한 줄씩 쌓고 행 사이는 목록 선이다. 값에 `href`가 있으면 accent 링크다(소속 팀).
 * 있는 값만 넘긴다. 없는 항목의 자리를 비워 두지 않는다.
 *
 * @param items 라벨·값·(선택) 링크
 */
export function ProfileFacts({
  items,
}: {
  items: { label: string; value: string; href?: string }[];
}) {
  return (
    <dl>
      {items.map(({ label, value, href }) => (
        <div
          key={label}
          className="border-border-soft flex items-baseline gap-2.5 border-b py-2.75"
        >
          <dt className="text-label-lg text-text-3 w-16 shrink-0">{label}</dt>
          <dd className="text-body min-w-0 flex-1">
            {href ? (
              <Link
                href={href}
                className="text-accent font-bold active:opacity-60"
              >
                {value}
              </Link>
            ) : (
              <span className="text-text-strong font-medium">{value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
