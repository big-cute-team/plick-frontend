import Link from "next/link";

/**
 * 로그아웃 상태의 MY 본문 (KAN-319, 모바일 KAN-255 이식) — 프로필 대신 로그인을
 * 유도한다. 시안(KAN-567)의 웹 규칙대로 본문 카드에 테두리를 두르지 않고 제목, 안내
 * 한 줄, 채운 강조색 버튼만 둔다.
 */
export function LoginPromptCard() {
  return (
    <div className="max-w-narrow flex flex-col items-start gap-2">
      <p className="text-section text-text-strong tracking-title font-black">
        로그인이 필요해요
      </p>
      <p className="text-body text-text-3">
        로그인하고 응원팀 소식을 받아보세요
      </p>
      <Link
        href="/login"
        className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        로그인
      </Link>
    </div>
  );
}
