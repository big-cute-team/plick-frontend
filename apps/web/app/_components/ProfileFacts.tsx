/**
 * 프로필 우측 "기본 정보" 카드 (KAN-567 시안 프로필 1365-1379행) — 레일 테두리 카드에
 * 머리 38px 13/900, 행마다 라벨 70px 12 보조색 + 값 13. 있는 값만 넘겨 받는다. 팀,
 * 인물 프로필이 같이 쓴다.
 *
 * @param facts 라벨과 값. 비어 있으면 카드를 그리지 않는다
 */
export function ProfileFacts({
  facts,
}: {
  facts: { label: string; value: string }[];
}) {
  if (facts.length === 0) return null;
  return (
    <section aria-label="기본 정보" className="border-border-strong border">
      <div className="border-border flex h-9.5 items-center border-b px-3.5">
        <span className="text-body text-text-strong font-black">기본 정보</span>
      </div>
      <dl className="px-3.5 pt-1 pb-2">
        {facts.map(({ label, value }) => (
          <div
            key={label}
            className="border-border-soft flex items-baseline gap-2.5 border-b py-2"
          >
            <dt className="text-label text-text-3 w-17.5 shrink-0">{label}</dt>
            <dd className="text-body text-text-strong min-w-0 flex-1">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
