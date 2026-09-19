import type { Metadata } from "next";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import {
  ChevronMiniIcon,
  FileTextIcon,
  HelpCircleIcon,
  LockLineIcon,
  UserRoundIcon,
} from "@plick/ui/icons";
import { SettingRow } from "@plick/ui/SettingRow";
import { TEAMS } from "@plick/domain/constants";
import { getMyActivityCounts } from "@/_services/activity";
import { getMyProfile } from "@/_services/profile";
import { getAccessToken, getGuestExpiresAt } from "@/_services/session";
import { ActivityCard } from "./_components/ActivityCard";
import { DeleteAccountButton } from "./_components/DeleteAccountButton";
import { FavoriteTeamsCard } from "./_components/FavoriteTeamsCard";
import { GuestLinkCard } from "./_components/GuestLinkCard";
import { LoginPromptCard } from "./_components/LoginPromptCard";
import { LogoutButton } from "./_components/LogoutButton";
import { MyProfileCard } from "./_components/MyProfileCard";
import { APP_VERSION_LABEL } from "@/_constants/me";

/** 개인화 화면이라 색인 가치가 없다 — robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "MY",
  robots: { index: false, follow: false },
};

/**
 * MY 마이페이지 — 로그인 여부로 갈린다 (KAN-170·KAN-255, 피그마 26-6).
 * 로그인: 프로필 카드 + 응원팀 목록 카드(다중)·로그아웃. 로그아웃: 로그인 유도 카드.
 * FAQ·버전은 공통. 다크 모드 토글 카드는 걷어냈다 — 앱을 다크 고정으로 돌렸다.
 * 프로필은 `GET /users/me`로 읽는다(KAN-267) —
 * null이면 비로그인/토큰 무효로 보고 유도 카드.
 *
 * 활동 개수(KAN-495)는 프로필과 나란히 받는다. 실패해도 마이페이지는 떠야
 * 하므로 삼켜서 null로 두고, 카드는 숫자 없이 진입만 열어 둔다.
 *
 * 게스트는 세 번째 갈래다 (KAN-514). 프로필이 있으니 비로그인 카드를 띄울 수 없고,
 * 그렇다고 소셜 사용자와 같은 화면을 줄 수도 없다 — 닉네임이 자동 부여값이고 로그아웃·탈퇴는
 * 연동 전에는 뜻이 없다. 그래서 상단을 연동 카드로 바꾸고 소셜 전용 줄(차단 목록·로그아웃·
 * 탈퇴)을 감춘다. 활동 카드는 남긴다 — 좋아요와 조회 기록은 게스트도 쌓이고, 그게 연동할
 * 이유이기 때문이다.
 */
export default async function MyPage() {
  const accessToken = await getAccessToken();
  const guestExpiresAt = await getGuestExpiresAt();
  const [profile, counts] = await Promise.all([
    getMyProfile(),
    accessToken
      ? getMyActivityCounts(accessToken).catch((error: unknown) => {
          console.error("[me] 활동 개수 조회 실패:", error);
          return null;
        })
      : null,
  ]);
  const isGuest = profile?.isGuest ?? false;
  const isSocial = profile !== null && !isGuest;

  return (
    <AppShell>
      <TopBar />

      <ScrollArea>
        <div className="px-edge gap-gap-lg flex flex-col pt-3 pb-8">
          {isSocial && profile ? (
            <>
              <MyProfileCard nickname={profile.nickname ?? "닉네임 미설정"} />
              <FavoriteTeamsCard
                teams={profile.myTeams.map((code) => TEAMS[code])}
              />
              <ActivityCard counts={counts} />
            </>
          ) : isGuest ? (
            <>
              <GuestLinkCard guestExpiresAt={guestExpiresAt} />
              <ActivityCard counts={counts} />
            </>
          ) : (
            <LoginPromptCard />
          )}

          <section className="bg-elevate-2 border-border rounded-card divide-border divide-y overflow-hidden border">
            {/* 차단 목록은 소셜 사용자에게만 있는 개인 데이터라 조건부로 넣는다
                (KAN-411, KAN-514에서 게스트 제외) */}
            {isSocial && (
              <SettingRow
                href="/me/blocked"
                icon={<UserRoundIcon size={19} />}
                label="차단 목록"
                trailing={<ChevronMiniIcon className="text-text-4 shrink-0" />}
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
          </section>

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
      </ScrollArea>

      <TabBar />
    </AppShell>
  );
}
