import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { GoogleIcon, KakaoIcon } from "@plick/ui/icons";
import { SocialLoginButton } from "@plick/ui/SocialLoginButton";

/** W7 회원가입 — 다크 배경 중앙 카드에 로고·태그라인 + 카카오/구글 소셜 가입 + 약관·로그인 링크 (KAN-246, 피그마 205-2). */
export default function SignupPage() {
  return (
    <main className="px-edge flex min-h-dvh items-center justify-center py-16">
      <section className="border-border bg-elevate-2 rounded-hero max-w-auth gap-gap flex w-full flex-col border px-10 pt-12 pb-10">
        <div className="flex flex-col items-center gap-3.5 pb-6">
          <Logo height={38} />
          <p className="text-body text-text-3 tracking-snug font-semibold">
            간편하게 가입하고 팀 소식을 받아보세요
          </p>
        </div>

        <SocialLoginButton
          icon={<KakaoIcon />}
          label="카카오로 회원가입"
          className="bg-kakao h-13"
        />
        <SocialLoginButton
          icon={<GoogleIcon />}
          label="구글로 회원가입"
          className="bg-media-on border-border-strong h-13 border"
        />

        <p className="text-caption text-text-4 pt-0.5 text-center">
          가입 시 <span className="underline">이용약관</span> 및{" "}
          <span className="underline">개인정보처리방침</span>에 동의하게 됩니다
        </p>

        <p className="text-body text-text-3 pt-3.5 text-center">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="text-accent focus-visible:ring-accent rounded-sm font-extrabold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            로그인
          </Link>
        </p>
      </section>
    </main>
  );
}
