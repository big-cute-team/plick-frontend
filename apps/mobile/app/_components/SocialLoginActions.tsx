"use client";

import { useState, useTransition } from "react";
import { GoogleIcon, KakaoIcon } from "@plick/ui/icons";
import { SocialLoginButton } from "@plick/ui/SocialLoginButton";
import { startSocialLogin } from "@/_lib/api/auth";
import type { SocialProvider } from "@/_lib/api/types";

/**
 * 카카오/구글 버튼 묶음 — OAuth 시작 서버 액션을 연결하는 클라 경계.
 * 진행 중엔 두 버튼을 잠그고, 실패하면 액션이 준 메시지를 버튼 아래 보여준다.
 * 성공하면 액션이 프로바이더 인가 페이지로 redirect하므로 여기선 할 일이 없다.
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
        className="bg-kakao h-13"
        disabled={isPending}
        onClick={() => loginWith("KAKAO")}
      />
      <SocialLoginButton
        icon={<GoogleIcon />}
        label={`구글로 ${actionLabel}`}
        className="bg-media-on border-border-strong h-13.5 border"
        disabled={isPending}
        onClick={() => loginWith("GOOGLE")}
      />
      {error && (
        <p className="text-caption text-danger text-center" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
