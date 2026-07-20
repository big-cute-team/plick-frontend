import { AuthScreen } from "@/_components/AuthScreen";

/** A1 로그인 — 로고·태그라인 + 카카오/구글 소셜 로그인 (KAN-174, 피그마 105-6). */
export default function LoginPage() {
  return (
    <AuthScreen
      tagline="축구 이적 뉴스, 팬 반응까지 한 번에"
      actionLabel="로그인"
      homeHref="/"
      switchPrompt="처음이신가요?"
      switchHref="/signup"
      switchLabel="회원가입"
    />
  );
}
