import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { guestLinkNotice, loginErrorMessage } from "@plick/domain/format";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/_components/AuthScreen";
import { WEB_SITE_URL } from "@/_constants/site";
import { getMyProfile } from "@/_services/profile";
import { getGuestExpiresAt } from "@/_services/session";

/** canonical은 데스크톱 로그인이다 (KAN-346) — 모바일 홈 canonical과 같은 이유. */
export const metadata: Metadata = {
  title: "로그인",
  description: PAGE_DESCRIPTIONS.login,
  alternates: { canonical: `${WEB_SITE_URL}/login` },
};

/**
 * A1 로그인 / 게스트 계정 연동 — 로고·태그라인 + 카카오/구글 소셜 버튼 (KAN-174, 피그마 105-6).
 * 이미 로그인된 세션이면 홈으로 보낸다(KAN-320) — 쿠키 존재가 아니라 `GET /users/me`로
 * 세션이 실제로 유효한지 확인한다. 만료·무효 토큰이면 null이라 로그인 화면이 그대로 열린다.
 * `?error=`는 OAuth 콜백 실패(`oauth`)와 탈퇴 후 7일 재가입 제한(`rejoin`, KAN-393)을
 * 구분한다 — rejoin은 `?until=`(재가입 가능 시각)까지 문구에 싣는다.
 *
 * 게스트 세션이면 이 화면이 **연동 화면**으로 성격이 바뀐다 (KAN-514). 게스트도 세션이
 * 있어 `getMyProfile()`이 값을 주므로, 예전처럼 "프로필이 있으면 홈으로"를 그대로 두면
 * 게스트가 로그인 화면에 못 들어온다. 그래서 소셜 사용자만 되돌려 보낸다. 게스트에게는
 * 마감 안내를 띄우고 버튼 문구를 "연동"으로 바꾼다 — 소셜 버튼이 무엇을 부르는지(연동이냐
 * 로그인이냐)는 화면이 아니라 콜백이 마감 쿠키로 가른다.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; until?: string }>;
}) {
  const profile = await getMyProfile();
  if (profile && !profile.isGuest) {
    redirect("/");
  }

  const isGuest = profile?.isGuest ?? false;
  const { error, until } = await searchParams;

  return (
    <AuthScreen
      tagline={
        isGuest
          ? "계정을 연결하면 지금까지 기록이 그대로 남아요"
          : "축구 이적 뉴스, 팬 반응까지 한 번에"
      }
      actionLabel={isGuest ? "연동" : "로그인"}
      notice={isGuest ? guestLinkNotice(await getGuestExpiresAt()) : undefined}
      skipHref="/"
      switchPrompt={isGuest ? undefined : "처음이신가요?"}
      switchHref={isGuest ? undefined : "/signup"}
      switchLabel={isGuest ? undefined : "회원가입"}
      errorMessage={loginErrorMessage(error, until)}
    />
  );
}
