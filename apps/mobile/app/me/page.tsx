import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { ChevronMiniIcon, HelpCircleIcon } from "@plick/ui/icons";
import { PreferenceCard } from "@plick/ui/PreferenceCard";
import { SettingRow } from "@plick/ui/SettingRow";
import { TEAMS } from "@plick/domain/constants";
import { getMyProfile } from "@/_lib/api/profile";
import { LoginPromptCard } from "./_components/LoginPromptCard";
import { LogoutButton } from "./_components/LogoutButton";
import { ProfileTeamCard } from "./_components/ProfileTeamCard";
import { APP_VERSION_LABEL } from "./_lib/constants";

/**
 * MY 마이페이지 — 로그인 여부로 갈린다 (KAN-170·KAN-255, 피그마 26-6).
 * 로그인: 프로필+응원팀 통합 카드·로그아웃. 로그아웃: 로그인 유도 카드. 환경설정·FAQ·버전은 공통.
 * 프로필은 `GET /users/me`로 읽는다(KAN-267) — null이면 비로그인/토큰 무효로 보고 유도 카드.
 */
export default async function MyPage() {
  const profile = await getMyProfile();
  const team = profile?.myTeam ? TEAMS[profile.myTeam] : null;

  return (
    <AppShell>
      <TopBar notif={3} />

      <ScrollArea>
        <div className="px-edge gap-gap-lg flex flex-col pt-3 pb-8">
          {profile ? (
            <ProfileTeamCard
              nickname={profile.nickname ?? "닉네임 미설정"}
              team={team}
            />
          ) : (
            <LoginPromptCard />
          )}

          <PreferenceCard />

          <section className="bg-elevate-2 border-border rounded-card border">
            <SettingRow
              pressable
              icon={<HelpCircleIcon />}
              label="FAQ"
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
