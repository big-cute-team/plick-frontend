import { AuthScreen } from "@/_components/AuthScreen";

/** A1 로그인 — 로고·태그라인 + 카카오/구글 소셜 로그인 (KAN-174, 피그마 105-6). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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
