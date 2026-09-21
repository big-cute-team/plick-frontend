import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { AppShell } from "./AppShell";
import { BackButton } from "./BackButton";
import { BottomActionBar } from "./BottomActionBar";
import { SocialLoginActions } from "./SocialLoginActions";
import { TopBarShell } from "./TopBarShell";

/**
 * 소셜 인증 화면 — 로고·태그라인 + 카카오/구글 버튼 + 하단 전환 링크.
 * 로그인(A1)·회원가입(A2)이 카피만 주입해 공용한다 (웹 `AuthCard`의 모바일 대응).
 *
 * 하단에 있던 "로그인 없이 이용하기"(안내 팝업 → 홈)는 KAN-514에서 걷어냈다. 이제
 * 첫 진입에 게스트가 발급돼 로그인 없이 쓰는 게 기본 동작이라, 별도 버튼과 "일부 기능을
 * 쓸 수 없다"는 경고가 둘 다 사실과 어긋난다. 대신 화면을 빠져나갈 길은 남겨야 해서
 * `skipHref`로 "나중에 할게요"를 둔다 — 없으면 로그인 화면이 막다른 길이 된다.
 *
 * @param tagline - 로고 아래 한 줄 카피
 * @param actionLabel - 소셜 버튼 동사 (예: "로그인" → "카카오로 로그인")
 * @param notice - 버튼 위에 띄울 안내 (게스트 연동 마감 문구, KAN-514)
 * @param skipHref - 있으면 하단에 "나중에 할게요" 링크를 둔다
 * @param backHref - 있으면 상단 좌측에 뒤로가기 바를 얹는다(회원가입)
 * @param terms - 버튼 아래 약관 안내(회원가입)
 * @param switchPrompt - 하단 전환 문구 (예: 처음이신가요?). 셋이 다 있어야 전환 줄이 뜬다
 * @param switchHref - 전환 링크 경로
 * @param switchLabel - 전환 링크 라벨
 * @param errorMessage - 진입 시 버튼 아래 띄울 에러 (OAuth 콜백 실패 안내)
 */
export function AuthScreen({
  tagline,
  actionLabel,
  notice,
  backHref,
  skipHref,
  terms,
  switchPrompt,
  switchHref,
  switchLabel,
  errorMessage,
}: {
  tagline: string;
  actionLabel: string;
  notice?: string;
  backHref?: string;
  skipHref?: string;
  terms?: ReactNode;
  switchPrompt?: string;
  switchHref?: string;
  switchLabel?: string;
  errorMessage?: string;
}) {
  return (
    <AppShell>
      <main className="relative flex h-full flex-col">
        {backHref && (
          <TopBarShell className="absolute inset-x-0 top-0">
            <BackButton href={backHref} />
          </TopBarShell>
        )}

        <section className="px-edge gap-gap-lg flex flex-1 flex-col items-center justify-center">
          <Logo height={34} />
          <p className="text-body text-text-3 font-semibold tracking-tight">
            {tagline}
          </p>
        </section>

        <BottomActionBar base={64} className="gap-gap flex flex-col">
          {notice && (
            <p className="text-label text-text-3 pb-1 text-center">{notice}</p>
          )}

          <SocialLoginActions
            actionLabel={actionLabel}
            initialError={errorMessage}
          />

          {terms}

          {switchPrompt && switchHref && switchLabel && (
            <p className="text-body text-text-3 pt-3.5 text-center">
              {switchPrompt}{" "}
              <Link
                href={switchHref}
                className="text-accent font-extrabold active:opacity-60"
              >
                {switchLabel}
              </Link>
            </p>
          )}

          {skipHref && (
            <Link
              href={skipHref}
              className="text-label text-text-4 mx-auto block font-semibold underline active:opacity-60"
            >
              나중에 할게요
            </Link>
          )}
        </BottomActionBar>
      </main>
    </AppShell>
  );
}
