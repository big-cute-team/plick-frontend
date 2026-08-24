"use client";

import { useState, useTransition } from "react";
import { AppleIcon, GoogleIcon, KakaoIcon } from "@plick/ui/icons";
import { SocialLoginButton } from "@plick/ui/SocialLoginButton";
import { startSocialLogin } from "@/_services/auth";
import type { SocialProvider } from "@/_types/api";

/**
 * 카카오/구글/애플 버튼 묶음 — OAuth 시작 서버 액션을 연결하는 클라 경계 (KAN-318, KAN-395).
 * 진행 중엔 세 버튼을 잠그고, 실패하면 액션이 준 메시지를 버튼 아래 보여준다.
 * 성공하면 액션이 프로바이더 인가 페이지로 redirect하므로 여기선 할 일이 없다.
 * 모바일 `SocialLoginActions`와 같은 구조인데, `AuthCard`가 버튼 문구를 통째로
 * 주입하던 관용을 유지해 라벨을 그대로 받는다. 애플 버튼은 Sign in with Apple HIG에
 * 따라 배경 검정·글자 흰색이고, 로고는 `AppleIcon`(실제 브랜드 마크)이다.
 *
 * @param kakaoLabel - 카카오 버튼 문구
 * @param googleLabel - 구글 버튼 문구
 * @param appleLabel - 애플 버튼 문구
 * @param initialError - 첫 렌더에 띄울 에러 (OAuth 콜백 실패 후 돌아온 경우)
 */
export function SocialLoginActions({
  kakaoLabel,
  googleLabel,
  appleLabel,
  initialError,
}: {
  kakaoLabel: string;
  googleLabel: string;
  appleLabel: string;
  initialError?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const loginWith = (provider: SocialProvider) => {
    setError(null);
    startTransition(async () => {
      const result = await startSocialLogin(provider);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <>
      <SocialLoginButton
        icon={<KakaoIcon />}
        label={kakaoLabel}
        className="bg-kakao text-on-kakao h-13"
        disabled={isPending}
        onClick={() => loginWith("KAKAO")}
      />
      <SocialLoginButton
        icon={<GoogleIcon />}
        label={googleLabel}
        className="bg-media-on text-on-kakao border-border-strong h-13 border"
        disabled={isPending}
        onClick={() => loginWith("GOOGLE")}
      />
      <SocialLoginButton
        icon={<AppleIcon />}
        label={appleLabel}
        className="bg-apple text-on-apple h-13"
        disabled={isPending}
        onClick={() => loginWith("APPLE")}
      />
      {error && (
        <p className="text-caption text-danger text-center" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
