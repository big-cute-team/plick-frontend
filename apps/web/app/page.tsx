/**
 * 데스크톱 웹 자리 — 토큰 연결 확인용 플레이스홀더.
 *
 * 실제 화면은 모바일(apps/mobile) 이후 착수한다. 토큰·다크 기본·Pretendard
 * 세팅만 미리 맞춰 두어, 화면 작업 시작 시 모바일과 같은 규칙으로 바로 만든다.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <h1 className="text-headline font-extrabold">
        PL<span className="text-accent">i</span>ck
      </h1>
      <p className="text-body-lg text-text-3">
        데스크톱 웹은 준비 중이에요 — 모바일 웹(:3001)을 먼저 만나보세요
      </p>
    </main>
  );
}
