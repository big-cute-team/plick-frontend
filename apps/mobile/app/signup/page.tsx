import { AuthScreen } from "@/_components/AuthScreen";

/** A2 회원가입 — 뒤로가기 + 로고·태그라인 + 카카오/구글 소셜 가입 + 약관·로그인 링크 (KAN-175, 피그마 104-6). */
export default function SignupPage() {
  return (
    <AuthScreen
      tagline="간편하게 가입하고 팀 소식을 받아보세요"
      actionLabel="회원가입"
      backHref="/login"
      terms={
        <p className="text-caption text-text-4 pt-0.5 text-center">
          가입 시 <span className="underline">이용약관</span> 및{" "}
          <span className="underline">개인정보처리방침</span>에 동의하게 됩니다
        </p>
      }
      switchPrompt="이미 계정이 있으신가요?"
      switchHref="/login"
      switchLabel="로그인"
    />
  );
}
