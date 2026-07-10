import Link from "next/link";
import { AppShell } from "@/_components/AppShell";
import { Logo } from "@/_components/Logo";
import { ArrowLeftIcon, GoogleIcon, KakaoIcon } from "@/_components/icons";
import { SocialLoginButton } from "@/_components/SocialLoginButton";

/** A2 회원가입 — 뒤로가기 + 로고·태그라인 + 카카오/구글 소셜 가입 + 약관·로그인 링크 (KAN-175, 피그마 104-6). */
export default function SignupPage() {
  return (
    <AppShell>
      <main className="relative flex h-full flex-col">
        <div
          className="absolute inset-x-0 top-0"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="px-edge flex h-13 items-center">
            <Link
              href="/login"
              aria-label="뒤로"
              className="text-icon -ml-1.5 grid size-9 place-items-center active:opacity-60"
            >
              <ArrowLeftIcon size={20} />
            </Link>
          </div>
        </div>

        <section className="px-edge flex flex-1 flex-col items-center justify-center gap-3.5">
          <Logo height={34} />
          <p className="text-body text-text-3 font-semibold tracking-[-0.2px]">
            간편하게 가입하고 팀 소식을 받아보세요
          </p>
        </section>

        <section
          className="px-edge flex flex-col gap-3"
          /* 피그마 하단 여백 64px, 홈 인디케이터가 그보다 두꺼운 기기에선 24px 띄움 */
          style={{
            paddingBottom: "max(64px, env(safe-area-inset-bottom) + 24px)",
          }}
        >
          <SocialLoginButton
            icon={<KakaoIcon />}
            label="카카오로 회원가입"
            className="bg-kakao h-13"
          />
          <SocialLoginButton
            icon={<GoogleIcon />}
            label="구글로 회원가입"
            className="bg-media-on border-border-strong h-13.5 border"
          />

          <p className="text-caption text-text-4 pt-0.5 text-center">
            가입 시 <span className="underline">이용약관</span> 및{" "}
            <span className="underline">개인정보처리방침</span>에 동의하게
            됩니다
          </p>

          <p className="text-body text-text-3 pt-3.5 text-center">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="text-accent font-extrabold active:opacity-60"
            >
              로그인
            </Link>
          </p>
        </section>
      </main>
    </AppShell>
  );
}
