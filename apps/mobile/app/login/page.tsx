import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/_components/AuthScreen";
import { WEB_SITE_URL } from "@/_constants/site";
import { getMyProfile } from "@/_services/profile";

/** canonical은 데스크톱 로그인이다 (KAN-346) — 모바일 홈 canonical과 같은 이유. */
export const metadata: Metadata = {
  title: "로그인",
  description: PAGE_DESCRIPTIONS.login,
  alternates: { canonical: `${WEB_SITE_URL}/login` },
};

/**
 * A1 로그인 — 로고·태그라인 + 카카오/구글 소셜 로그인 (KAN-174, 피그마 105-6).
 * 이미 로그인된 세션이면 홈으로 보낸다(KAN-320) — 쿠키 존재가 아니라 `GET /users/me`로
 * 세션이 실제로 유효한지 확인한다. 만료·무효 토큰이면 null이라 로그인 화면이 그대로 열린다.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getMyProfile();
  if (profile) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <AuthScreen
      tagline="축구 이적 뉴스, 팬 반응까지 한 번에"
      actionLabel="로그인"
      switchPrompt="처음이신가요?"
      switchHref="/signup"
      switchLabel="회원가입"
      errorMessage={
        error === "oauth"
          ? "소셜 로그인에 실패했어요. 다시 시도해 주세요."
          : undefined
      }
    />
  );
}
