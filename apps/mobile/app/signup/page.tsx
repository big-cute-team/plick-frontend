import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/_components/AuthScreen";
import { WEB_SITE_URL } from "@/_constants/site";

/** canonical은 데스크톱 회원가입이다 (KAN-346) — 모바일 홈 canonical과 같은 이유. */
export const metadata: Metadata = {
  title: "회원가입",
  alternates: { canonical: `${WEB_SITE_URL}/signup` },
};

/** A2 회원가입 — 뒤로가기 + 로고·태그라인 + 카카오/구글 소셜 가입 + 약관·로그인 링크 (KAN-175, 피그마 104-6). */
export default function SignupPage() {
  return (
    <AuthScreen
      tagline="간편하게 가입하고 팀 소식을 받아보세요"
      actionLabel="회원가입"
      backHref="/login"
      terms={
        <p className="text-caption text-text-4 pt-0.5 text-center">
          가입 시{" "}
          <Link href="/terms" className="underline">
            이용약관
          </Link>{" "}
          및{" "}
          <Link href="/privacy" className="underline">
            개인정보처리방침
          </Link>
          에 동의하게 됩니다
        </p>
      }
      switchPrompt="이미 계정이 있으신가요?"
      switchHref="/login"
      switchLabel="로그인"
    />
  );
}
