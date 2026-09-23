import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { SocialLoginActions } from "./SocialLoginActions";

/**
 * 소셜 인증 카드 — 다크 배경 중앙에 로고·태그라인 + 카카오/구글 소셜 버튼 + (선택)약관 + 하단 전환 링크.
 * 로그인(W6)·회원가입(W7)이 카피만 다르고 형태가 같아 공용으로 뺐다. 피그마 206-2 / 205-2.
 * 버튼은 `SocialLoginActions`가 OAuth 시작 서버 액션과 연결한다(KAN-318).
 *
 * 하단에 있던 "로그인 없이 이용하기"(안내 팝업 → 홈)는 KAN-514에서 걷어냈다. 첫 진입에
 * 게스트가 발급돼 로그인 없이 쓰는 게 기본 동작이 되면서, 별도 버튼과 "일부 기능을 쓸 수
 * 없다"는 경고가 둘 다 사실과 어긋나게 됐다. 빠져나갈 길은 `skipHref`로 남긴다.
 *
 * @param tagline - 로고 아래 한 줄 소개
 * @param notice - 버튼 위에 띄울 안내 (게스트 연동 마감 문구, KAN-514)
 * @param skipHref - 있으면 하단에 "나중에 할게요" 링크를 둔다
 * @param kakaoLabel - 카카오 버튼 문구
 * @param googleLabel - 구글 버튼 문구
 * @param appleLabel - 애플 버튼 문구 (KAN-395)
 * @param terms - 약관 동의 문구 노출 여부(회원가입만 true)
 * @param footerPrompt - 하단 안내 문구("이미 계정이 있으신가요?" 등). 셋이 다 있어야 전환 줄이 뜬다
 * @param footerLinkLabel - 하단 전환 링크 문구("로그인"/"회원가입")
 * @param footerHref - 전환 링크 목적지
 * @param errorMessage - 진입 시 버튼 아래 띄울 에러 (OAuth 콜백 실패 안내)
 */
export function AuthCard({
  tagline,
  kakaoLabel,
  googleLabel,
  appleLabel,
  notice,
  skipHref,
  terms = false,
  footerPrompt,
  footerLinkLabel,
  footerHref,
  errorMessage,
}: {
  tagline: string;
  kakaoLabel: string;
  googleLabel: string;
  appleLabel: string;
  notice?: string;
  skipHref?: string;
  terms?: boolean;
  footerPrompt?: string;
  footerLinkLabel?: string;
  footerHref?: string;
  errorMessage?: string;
}) {
  return (
    <main className="px-edge flex min-h-dvh items-center justify-center py-16">
      <section className="border-border bg-elevate-2 rounded-hero max-w-auth gap-gap flex w-full flex-col border px-10 pt-12 pb-10">
        <div className="flex flex-col items-center gap-3.5 pb-6">
          <Logo size={43} />
          <p className="text-body text-text-3 tracking-snug font-semibold">
            {tagline}
          </p>
        </div>

        {notice && (
          <p className="text-label text-text-3 pb-1 text-center">{notice}</p>
        )}

        <SocialLoginActions
          kakaoLabel={kakaoLabel}
          googleLabel={googleLabel}
          appleLabel={appleLabel}
          initialError={errorMessage}
        />

        {terms && (
          <p className="text-caption text-text-4 pt-0.5 text-center">
            가입 시{" "}
            <Link href="/terms" className="hover:text-text-3 underline">
              이용약관
            </Link>{" "}
            및{" "}
            <Link href="/privacy" className="hover:text-text-3 underline">
              개인정보처리방침
            </Link>
            에 동의하게 됩니다
          </p>
        )}

        {footerPrompt && footerHref && footerLinkLabel && (
          <p className="text-body text-text-3 pt-3.5 text-center">
            {footerPrompt}{" "}
            <Link
              href={footerHref}
              className="text-accent focus-visible:ring-accent rounded-sm font-extrabold hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {footerLinkLabel}
            </Link>
          </p>
        )}

        {skipHref && (
          <Link
            href={skipHref}
            className="text-label text-text-4 focus-visible:ring-accent hover:text-text-3 mx-auto block rounded-sm font-semibold underline focus-visible:ring-2 focus-visible:outline-none"
          >
            나중에 할게요
          </Link>
        )}
      </section>
    </main>
  );
}
