import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { loginErrorMessage } from "@plick/domain/format";
import { redirect } from "next/navigation";
import { AuthCard } from "@/_components/AuthCard";
import { getMyProfile } from "@/_services/profile";

/** 이 URL이 canonical이다 (KAN-346). 모바일 로그인의 canonical이 여기를 가리킨다. */
export const metadata: Metadata = {
  title: "로그인",
  description: PAGE_DESCRIPTIONS.login,
  alternates: { canonical: "/login" },
};

/**
 * W6 로그인 — 다크 배경 중앙 카드(로고·태그라인 + 카카오/구글 소셜 로그인 + 회원가입 링크).
 * KAN-246, 피그마 206-2. 이미 로그인된 세션이면 홈으로 보낸다(KAN-320) — 쿠키 존재가
 * 아니라 `GET /users/me`로 세션이 실제로 유효한지 확인한다. 만료·무효 토큰이면 null이라
 * 로그인 화면이 그대로 열린다.
 * `?error=`는 OAuth 콜백 실패(`oauth`)와 탈퇴 후 7일 재가입 제한(`rejoin`, KAN-393)을
 * 구분한다 — rejoin은 `?until=`(재가입 가능 시각)까지 문구에 싣는다.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; until?: string }>;
}) {
  const profile = await getMyProfile();
  if (profile) {
    redirect("/");
  }

  const { error, until } = await searchParams;

  return (
    <AuthCard
      tagline="축구 이적 뉴스, 팬 반응까지 한 번에"
      kakaoLabel="카카오로 로그인"
      googleLabel="구글로 로그인"
      appleLabel="Apple로 로그인"
      footerPrompt="처음이신가요?"
      footerLinkLabel="회원가입"
      footerHref="/signup"
      errorMessage={loginErrorMessage(error, until)}
    />
  );
}
