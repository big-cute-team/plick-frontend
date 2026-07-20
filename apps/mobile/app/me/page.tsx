import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import {
  ChevronMiniIcon,
  HelpCircleIcon,
  TeamShieldIcon,
} from "@plick/ui/icons";
import { PreferenceCard } from "@plick/ui/PreferenceCard";
import { ProfileCard } from "@plick/ui/ProfileCard";
import { SettingRow } from "@plick/ui/SettingRow";
import { TEAMS } from "@plick/domain/constants";
import { isLoggedIn } from "@/_lib/api/session";
import { CURRENT_USER } from "@/_lib/mock";
import { LoginPromptCard } from "./_components/LoginPromptCard";
import { LogoutButton } from "./_components/LogoutButton";
import { APP_VERSION_LABEL } from "./_lib/constants";

/**
 * MY 마이페이지 — 로그인 여부로 갈린다 (KAN-170·KAN-255, 피그마 26-6).
 * 로그인: 프로필·응원팀·로그아웃. 로그아웃: 로그인 유도 카드. 환경설정·FAQ·버전은 공통.
 * 로그인 여부는 accessToken 쿠키 존재로 판단(서버 렌더 중, BE 호출 없이).
 */
export default async function MyPage() {
  const loggedIn = await isLoggedIn();
  const team = TEAMS[CURRENT_USER.myTeam];

  return (
    <AppShell>
      <TopBar notif={3} />

      <ScrollArea>
        <div className="px-edge gap-gap-lg flex flex-col pt-3 pb-8">
          {loggedIn ? (
            <>
              <ProfileCard
                nickname={CURRENT_USER.nickname}
                handle={CURRENT_USER.handle}
                href="/me/edit"
              />

              <section className="bg-elevate-2 border-border rounded-card border">
                <SettingRow
                  pressable
                  icon={<TeamShieldIcon />}
                  label="응원팀"
                  trailing={
                    <>
                      <span className="bg-accent-tint text-accent rounded-pill text-label px-3 py-1.5 font-extrabold">
                        {team.name}
                      </span>
                      <ChevronMiniIcon className="text-text-4 shrink-0" />
                    </>
                  }
                />
              </section>
            </>
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

          {loggedIn && <LogoutButton />}

          <p className="text-caption text-text-4 text-center">
            {APP_VERSION_LABEL}
          </p>
        </div>
      </ScrollArea>

      <TabBar />
    </AppShell>
  );
}
