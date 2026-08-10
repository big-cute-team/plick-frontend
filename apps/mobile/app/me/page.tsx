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
} from "@plick/ui/icons";
import { SettingRow } from "@plick/ui/SettingRow";
import { TEAMS } from "@plick/domain/constants";
import { getMyProfile } from "@/_services/profile";
import { FavoriteTeamsCard } from "./_components/FavoriteTeamsCard";
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
 */
export default async function MyPage() {
  const profile = await getMyProfile();

  return (
    <AppShell>
      <TopBar />

      <ScrollArea>
        <div className="px-edge gap-gap-lg flex flex-col pt-3 pb-8">
          {profile ? (
            <>
              <MyProfileCard nickname={profile.nickname ?? "닉네임 미설정"} />
              <FavoriteTeamsCard
                teams={profile.myTeams.map((code) => TEAMS[code])}
              />
            </>
          ) : (
            <LoginPromptCard />
          )}

          <section className="bg-elevate-2 border-border rounded-card divide-border divide-y overflow-hidden border">
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

          {profile && <LogoutButton />}

          <p className="text-caption text-text-4 text-center">
            {APP_VERSION_LABEL}
          </p>
        </div>
      </ScrollArea>

      <TabBar />
    </AppShell>
  );
}
