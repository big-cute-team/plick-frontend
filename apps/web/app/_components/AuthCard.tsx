import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { GoogleIcon, KakaoIcon } from "@plick/ui/icons";
import { SocialLoginButton } from "@plick/ui/SocialLoginButton";

/**
 * 소셜 인증 카드 — 다크 배경 중앙에 로고·태그라인 + 카카오/구글 소셜 버튼 + (선택)약관 + 하단 전환 링크.
 * 로그인(W6)·회원가입(W7)이 카피만 다르고 형태가 같아 공용으로 뺐다. 피그마 206-2 / 205-2.
 *
 * @param tagline - 로고 아래 한 줄 소개
 * @param kakaoLabel - 카카오 버튼 문구
 * @param googleLabel - 구글 버튼 문구
 * @param terms - 약관 동의 문구 노출 여부(회원가입만 true)
 * @param footerPrompt - 하단 안내 문구("이미 계정이 있으신가요?" 등)
 * @param footerLinkLabel - 하단 전환 링크 문구("로그인"/"회원가입")
 * @param footerHref - 전환 링크 목적지
 */
export function AuthCard({
  tagline,
  kakaoLabel,
  googleLabel,
  terms = false,
  footerPrompt,
  footerLinkLabel,
  footerHref,
}: {
  tagline: string;
  kakaoLabel: string;
  googleLabel: string;
  terms?: boolean;
  footerPrompt: string;
  footerLinkLabel: string;
  footerHref: string;
}) {
  return (
    <main className="px-edge flex min-h-dvh items-center justify-center py-16">
      <section className="border-border bg-elevate-2 rounded-hero max-w-auth gap-gap flex w-full flex-col border px-10 pt-12 pb-10">
        <div className="flex flex-col items-center gap-3.5 pb-6">
          <Logo height={38} />
          <p className="text-body text-text-3 tracking-snug font-semibold">
            {tagline}
          </p>
        </div>

        <SocialLoginButton
          icon={<KakaoIcon />}
          label={kakaoLabel}
          className="bg-kakao h-13"
        />
        <SocialLoginButton
          icon={<GoogleIcon />}
          label={googleLabel}
          className="bg-media-on border-border-strong h-13 border"
        />

        {terms && (
          <p className="text-caption text-text-4 pt-0.5 text-center">
            가입 시 <span className="underline">이용약관</span> 및{" "}
            <span className="underline">개인정보처리방침</span>에 동의하게
            됩니다
          </p>
        )}

        <p className="text-body text-text-3 pt-3.5 text-center">
          {footerPrompt}{" "}
          <Link
            href={footerHref}
            className="text-accent focus-visible:ring-accent rounded-sm font-extrabold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
