import { AuthCard } from "@/_components/AuthCard";

/** W7 회원가입 — 다크 배경 중앙 카드(로고·태그라인 + 카카오/구글 소셜 가입 + 약관 + 로그인 링크). KAN-246, 피그마 205-2. */
export default function SignupPage() {
  return (
    <AuthCard
      tagline="간편하게 가입하고 팀 소식을 받아보세요"
      kakaoLabel="카카오로 회원가입"
      googleLabel="구글로 회원가입"
      terms
      footerPrompt="이미 계정이 있으신가요?"
      footerLinkLabel="로그인"
      footerHref="/login"
    />
  );
}
