import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { AuthCard } from "@/_components/AuthCard";

/** 이 URL이 canonical이다 (KAN-346). 모바일 회원가입의 canonical이 여기를 가리킨다. */
export const metadata: Metadata = {
  title: "회원가입",
  description: PAGE_DESCRIPTIONS.signup,
  alternates: { canonical: "/signup" },
};

/** W7 회원가입 — 다크 배경 중앙 카드(로고·태그라인 + 카카오/구글 소셜 가입 + 약관 + 로그인 링크). KAN-246, 피그마 205-2. */
export default function SignupPage() {
  return (
    <AuthCard
      tagline="간편하게 가입하고 팀 소식을 받아보세요"
      kakaoLabel="카카오로 회원가입"
      googleLabel="구글로 회원가입"
      appleLabel="Apple로 회원가입"
      terms
      footerPrompt="이미 계정이 있으신가요?"
      footerLinkLabel="로그인"
      footerHref="/login"
    />
  );
}
