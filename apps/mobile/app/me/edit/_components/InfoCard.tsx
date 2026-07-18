import type { User } from "@plick/domain/types";

/**
 * 프로필 기본 정보 카드 — 닉네임·이메일 표시 행(라벨 + 값).
 *
 * @param user - 표시할 로그인 유저
 */
export function InfoCard({ user }: { user: User }) {
  return (
    <section className="bg-elevate-2 border-border rounded-card border">
      <InfoRow label="닉네임" value={user.nickname} />
      <div className="bg-border mx-4 h-px" />
      <InfoRow label="이메일" value={user.email} />
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
