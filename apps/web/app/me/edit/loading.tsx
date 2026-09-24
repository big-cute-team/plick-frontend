import { MeShell } from "@/me/_components/MeShell";

/**
 * 계정 화면 로딩 자리 (KAN-319) — 초깃값 fetch(`GET /users/me`) 동안 닉네임, 이메일,
 * 응원팀 세 행의 실루엣을 잡아둔다. 제목과 좌측 메뉴는 정적이라 실물을 그대로 그린다.
 */
export default function ProfileEditLoading() {
  return (
    <MeShell>
      <h1 className="text-section text-text-strong tracking-title pb-5.5 font-black">
        계정
      </h1>
      <div className="max-w-narrow animate-pulse">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 pt-4 pb-2.25 ${
              i === 0 ? "border-border border-t" : "border-border-soft border-t"
            }`}
          >
            <div className="bg-chip h-3.5 w-24" />
            <div className="bg-chip h-3.5 w-40" />
          </div>
        ))}
      </div>
    </MeShell>
  );
}
