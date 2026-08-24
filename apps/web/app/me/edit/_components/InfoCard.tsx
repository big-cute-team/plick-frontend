/**
 * 프로필 기본 정보 카드 — 이메일 표시 행(라벨 + 값).
 * 닉네임은 아바타 밑에 크게 보여주므로 여기선 다루지 않는다(KAN-319, 모바일과 동일 구성).
 * 이메일은 카카오·애플 가입 등으로 없을 수 있어, null이면 카드 자체를 그리지 않는다.
 *
 * @param email - 이메일. 없으면 아무것도 렌더하지 않는다
 */
export function InfoCard({ email }: { email: string | null }) {
  if (!email) {
    return null;
  }

  return (
    <section className="bg-elevate-2 border-border rounded-card border">
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="text-body text-text-3 font-semibold">이메일</span>
        <span className="text-body text-text font-bold">{email}</span>
      </div>
    </section>
  );
}
