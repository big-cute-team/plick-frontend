import { AuthCard } from "@/_components/AuthCard";

/** W6 로그인 — 다크 배경 중앙 카드(로고·태그라인 + 카카오/구글 소셜 로그인 + 회원가입 링크). KAN-246, 피그마 206-2. */
export default function LoginPage() {
  return (
    <AuthCard
      tagline="축구 이적 뉴스, 팬 반응까지 한 번에"
      kakaoLabel="카카오로 로그인"
      googleLabel="구글로 로그인"
      footerPrompt="처음이신가요?"
      footerLinkLabel="회원가입"
      footerHref="/signup"
    />
  );
}
