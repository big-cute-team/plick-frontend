/**
 * 프로필 기본 정보 카드 — 닉네임·이메일 표시 행(라벨 + 값).
 * 이메일은 카카오 가입 등으로 없을 수 있어, null이면 행 자체를 숨긴다(구분선도 함께).
 *
 * @param nickname - 닉네임. 온보딩 전이면 null
 * @param email - 이메일. 없으면 행을 그리지 않는다
 */
export function InfoCard({
  nickname,
  email,
}: {
  nickname: string | null;
  email: string | null;
}) {
  return (
    <section className="bg-elevate-2 border-border rounded-card border">
      <InfoRow label="닉네임" value={nickname ?? "미설정"} />
      {email && (
        <>
          <div className="bg-border mx-4 h-px" />
          <InfoRow label="이메일" value={email} />
        </>
      )}
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
