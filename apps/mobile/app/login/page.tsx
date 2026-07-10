import Link from "next/link";
import { AppShell } from "@/_components/AppShell";
import { Logo } from "@/_components/Logo";
import { GoogleIcon, KakaoIcon } from "@/_components/icons";
import { SocialLoginButton } from "@/_components/SocialLoginButton";

/** A1 로그인 — 로고·태그라인 + 카카오/구글 소셜 로그인 (KAN-174, 피그마 105-6). */
export default function LoginPage() {
  return (
    <AppShell>
      <main className="flex h-full flex-col">
        <section className="px-edge gap-gap-lg flex flex-1 flex-col items-center justify-center">
          <Logo height={34} />
          <p className="text-body text-text-3 font-semibold tracking-tight">
            축구 이적 뉴스, 팬 반응까지 한 번에
          </p>
        </section>

        <section
          className="px-edge gap-gap flex flex-col"
          /* 피그마 하단 여백 64px, 홈 인디케이터가 그보다 두꺼운 기기에선 24px 띄움 */
          style={{
            paddingBottom: "max(64px, env(safe-area-inset-bottom) + 24px)",
          }}
        >
          <SocialLoginButton
            icon={<KakaoIcon />}
            label="카카오로 로그인"
            className="bg-kakao h-13"
          />
          <SocialLoginButton
            icon={<GoogleIcon />}
            label="구글로 로그인"
            className="bg-media-on border-border-strong h-13.5 border"
          />

          <p className="text-body text-text-3 pt-3.5 text-center">
            처음이신가요?{" "}
            <Link
              href="/signup"
              className="text-accent font-extrabold active:opacity-60"
            >
              회원가입
            </Link>
          </p>
        </section>
      </main>
    </AppShell>
  );
}
