import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronMiniIcon } from "@plick/ui/icons";
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
 * @param tagline - 로고 아래 한 줄 카피
 * @param actionLabel - 소셜 버튼 동사 (예: "로그인" → "카카오로 로그인")
 * @param backHref - 있으면 상단 좌측에 뒤로가기 바를 얹는다(회원가입)
 * @param homeHref - 있으면 상단 우측에 "둘러보기"(비로그인 탐색) 링크를 얹는다(로그인)
 * @param terms - 버튼 아래 약관 안내(회원가입)
 * @param switchPrompt - 하단 전환 문구 (예: 처음이신가요?)
 * @param switchHref - 전환 링크 경로
 * @param switchLabel - 전환 링크 라벨
 * @param errorMessage - 진입 시 버튼 아래 띄울 에러 (OAuth 콜백 실패 안내)
 */
export function AuthScreen({
  tagline,
  actionLabel,
  backHref,
  homeHref,
  terms,
  switchPrompt,
  switchHref,
  switchLabel,
  errorMessage,
}: {
  tagline: string;
  actionLabel: string;
  backHref?: string;
  homeHref?: string;
  terms?: ReactNode;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
  errorMessage?: string;
}) {
  return (
    <AppShell>
      <main className="relative flex h-full flex-col">
        {(backHref || homeHref) && (
          <TopBarShell
            className="absolute inset-x-0 top-0"
            innerClassName="justify-between"
          >
            {backHref ? <BackButton href={backHref} /> : <span />}
            {homeHref && (
              <Link
                href={homeHref}
                className="text-label text-text-3 -mr-1 flex items-center gap-0.5 font-semibold active:opacity-60"
              >
                둘러보기
                <ChevronMiniIcon />
              </Link>
            )}
          </TopBarShell>
        )}

        <section className="px-edge gap-gap-lg flex flex-1 flex-col items-center justify-center">
          <Logo height={34} />
          <p className="text-body text-text-3 font-semibold tracking-tight">
            {tagline}
          </p>
        </section>

        <BottomActionBar base={64} className="gap-gap flex flex-col">
          <SocialLoginActions
            actionLabel={actionLabel}
            initialError={errorMessage}
          />

          {terms}

          <p className="text-body text-text-3 pt-3.5 text-center">
            {switchPrompt}{" "}
            <Link
              href={switchHref}
              className="text-accent font-extrabold active:opacity-60"
            >
              {switchLabel}
            </Link>
          </p>
        </BottomActionBar>
      </main>
    </AppShell>
  );
}
