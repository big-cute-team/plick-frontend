import Link from "next/link";

/**
 * 온보딩 건너뛰기 링크 (KAN-320, 모바일 이식) — 하단 CTA 버튼 위 "다음에 할게요".
 * 누르면 홈으로 간다. 가입 시 BE가 자동 닉네임을 부여하므로 온보딩을 건너뛰어도
 * 정상 상태다. 두 단계(닉네임·팀 선택) 공용이고 데스크톱이라 hover를 얹는다.
 */
export function SkipLink() {
  return (
    <div className="mb-3.5 text-center">
      <Link
        href="/"
        className="text-label text-text-4 hover:text-text-3 focus-visible:outline-accent font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
      >
        다음에 할게요
      </Link>
    </div>
  );
}
