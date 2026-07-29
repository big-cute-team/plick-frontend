import { redirect } from "next/navigation";
import { AuthCard } from "@/_components/AuthCard";
import { getMyProfile } from "@/_services/profile";

/**
 * W6 로그인 — 다크 배경 중앙 카드(로고·태그라인 + 카카오/구글 소셜 로그인 + 회원가입 링크).
 * KAN-246, 피그마 206-2. 이미 로그인된 세션이면 홈으로 보낸다(KAN-320) — 쿠키 존재가
 * 아니라 `GET /users/me`로 세션이 실제로 유효한지 확인한다. 만료·무효 토큰이면 null이라
 * 로그인 화면이 그대로 열린다.
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
    <AuthCard
      tagline="축구 이적 뉴스, 팬 반응까지 한 번에"
      kakaoLabel="카카오로 로그인"
      googleLabel="구글로 로그인"
      footerPrompt="처음이신가요?"
      footerLinkLabel="회원가입"
      footerHref="/signup"
      errorMessage={
        error === "oauth"
          ? "소셜 로그인에 실패했어요. 다시 시도해 주세요."
          : undefined
      }
    />
  );
}
