import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ChevronMiniIcon,
  FileTextIcon,
  HelpCircleIcon,
  LockLineIcon,
  UserRoundIcon,
} from "@plick/ui/icons";
import { ProfileCard } from "@plick/ui/ProfileCard";
import { SettingRow } from "@plick/ui/SettingRow";
import { SiteHeader } from "@/_components/SiteHeader";
import { TEAMS } from "@plick/domain/constants";
import { getMyProfile } from "@/_services/profile";
import { getGuestExpiresAt } from "@/_services/session";
import { APP_VERSION_LABEL } from "@/_constants/me";
import { DeleteAccountButton } from "./_components/DeleteAccountButton";
import { FavoriteTeamsCard } from "./_components/FavoriteTeamsCard";
import { GuestLinkCard } from "./_components/GuestLinkCard";
import { LoginPromptCard } from "./_components/LoginPromptCard";
import { LogoutButton } from "./_components/LogoutButton";

/** 개인화 화면이라 색인 가치가 없다 — robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "MY",
  robots: { index: false, follow: false },
};

/**
 * 데스크톱 마이페이지 (KAN-244 → KAN-319 API 연결) — GNB + 중앙 정렬 좁은 컬럼
 * (max-w-narrow). 프로필은 `GET /users/me`로 읽는다(모바일 KAN-267과 같은 계약) —
 * null이면 비로그인/토큰 무효로 보고 로그인 유도 카드. 응원팀은 다중 선택이라
 * 목록 카드로 보여준다. 프로필 카드의 보조 줄은 실계약에 핸들이 없어 이메일로
 * 대체한다(카카오·애플 가입은 이메일이 없어 줄을 숨긴다).
 *
 * 게스트는 세 번째 갈래다 (KAN-514). 프로필이 있으니 비로그인 카드를 띄울 수 없고,
 * 그렇다고 소셜 사용자와 같은 화면을 줄 수도 없다 — 닉네임이 자동 부여값이고 로그아웃·탈퇴는
 * 연동 전에는 뜻이 없다. 그래서 상단을 연동 카드로 바꾸고 소셜 전용 줄(차단 목록·로그아웃·
 * 탈퇴)을 감춘다. 활동 카드는 웹에 아직 없어 상단만 갈린다.
 */
export default async function MyPage() {
  const profile = await getMyProfile();
  const guestExpiresAt = await getGuestExpiresAt();
  const isGuest = profile?.isGuest ?? false;
  const isSocial = profile !== null && !isGuest;

  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <h1 className="text-hero text-text tracking-heading font-extrabold">
            MY
          </h1>

          <div className="gap-gap-lg flex flex-col pt-5.5">
            {isSocial && profile ? (
              <>
                <ProfileCard
                  nickname={profile.nickname ?? "닉네임 미설정"}
                  handle={profile.email ?? undefined}
                  href="/me/edit"
                />
                <FavoriteTeamsCard
                  teams={profile.myTeams.map((code) => TEAMS[code])}
                />
              </>
            ) : isGuest ? (
              <GuestLinkCard guestExpiresAt={guestExpiresAt} />
            ) : (
              <LoginPromptCard />
            )}

            <CardSection>
              {/* 차단 목록은 소셜 사용자에게만 있는 개인 데이터라 조건부로 넣는다
                  (KAN-411, KAN-514에서 게스트 제외) */}
              {isSocial && (
                <SettingRow
                  href="/me/blocked"
                  icon={<UserRoundIcon size={19} />}
                  label="차단 목록"
                  trailing={
                    <ChevronMiniIcon className="text-text-4 shrink-0" />
                  }
                />
              )}
              <SettingRow
                href="/faq"
                icon={<HelpCircleIcon />}
                label="FAQ"
                trailing={<ChevronMiniIcon className="text-text-4 shrink-0" />}
              />
              <SettingRow
                href="/terms"
                icon={<FileTextIcon />}
                label="이용약관"
                trailing={<ChevronMiniIcon className="text-text-4 shrink-0" />}
              />
              <SettingRow
                href="/privacy"
                icon={<LockLineIcon />}
                label="개인정보처리방침"
                trailing={<ChevronMiniIcon className="text-text-4 shrink-0" />}
              />
            </CardSection>

            {isSocial && (
              <>
                <LogoutButton />
                <DeleteAccountButton />
              </>
            )}

            <p className="text-caption text-text-4 text-center">
              {APP_VERSION_LABEL}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

/** 설정 줄들을 감싸는 카드 섀시 — 이 화면에서만 쓰는 사적 헬퍼. 줄 사이는 구분선. */
function CardSection({ children }: { children: ReactNode }) {
  return (
    <section className="bg-elevate-2 border-border rounded-card divide-border divide-y overflow-hidden border">
      {children}
    </section>
  );
}
