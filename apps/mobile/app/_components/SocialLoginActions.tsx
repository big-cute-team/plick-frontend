"use client";

import { useState, useTransition } from "react";
import { AppleIcon, GoogleIcon, KakaoIcon } from "@plick/ui/icons";
import { SocialLoginButton } from "@plick/ui/SocialLoginButton";
import { startSocialLogin } from "@/_services/auth";
import type { SocialProvider } from "@/_types/api";

/**
 * 카카오/구글/애플 버튼 묶음 — OAuth 시작 서버 액션을 연결하는 클라 경계.
 * 진행 중엔 세 버튼을 잠그고, 실패하면 액션이 준 메시지를 버튼 아래 보여준다.
 * 성공하면 액션이 프로바이더 인가 페이지로 redirect하므로 여기선 할 일이 없다.
 * 애플 버튼은 KAN-395로 추가됐다 — Sign in with Apple HIG에 따라 배경은 검정,
 * 로고·문구는 흰색이다. 애플 로고는 `AppleIcon`(실제 브랜드 마크)을 그대로 쓴다.
 *
 * @param actionLabel - 버튼 동사 (예: "로그인" → "카카오로 로그인")
 * @param initialError - 첫 렌더에 띄울 에러 (OAuth 콜백 실패 후 돌아온 경우)
 */
export function SocialLoginActions({
  actionLabel,
  initialError,
}: {
  actionLabel: string;
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
        label={`카카오로 ${actionLabel}`}
        className="bg-kakao text-on-kakao h-13"
        disabled={isPending}
        onClick={() => loginWith("KAKAO")}
      />
      <SocialLoginButton
        icon={<GoogleIcon />}
        label={`구글로 ${actionLabel}`}
        className="bg-media-on text-on-kakao border-border-strong h-13.5 border"
        disabled={isPending}
        onClick={() => loginWith("GOOGLE")}
      />
      <SocialLoginButton
        icon={<AppleIcon />}
        label={`Apple로 ${actionLabel}`}
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
