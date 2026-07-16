/**
 * 프로필 기본 정보 카드 — 닉네임·이메일 표시 행(라벨 + 값).
 *
 * 표시 전용(수정 불가)이라 필요한 값만 받는다. 두 행 사이는 전폭 구분선.
 *
 * @param nickname - 표시 닉네임
 * @param email - 표시 이메일
 */
export function InfoCard({
  nickname,
  email,
}: {
  nickname: string;
  email: string;
}) {
  return (
    <section className="bg-elevate-2 border-border rounded-card overflow-hidden border">
      <InfoRow label="닉네임" value={nickname} />
      <div className="border-border border-t">
        <InfoRow label="이메일" value={email} />
      </div>
    </section>
  );
}

/**
 * @param label - 좌측 회색 라벨
 * @param value - 우측 값
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-body text-text-3 font-semibold">{label}</span>
      <span className="text-body text-text font-bold">{value}</span>
    </div>
  );
}
