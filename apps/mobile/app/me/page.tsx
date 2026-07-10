import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import {
  ChevronMiniIcon,
  HelpCircleIcon,
  LogoutIcon,
  TeamShieldIcon,
} from "@/_components/icons";
import { TEAMS } from "@/_lib/constants";
import { CURRENT_USER } from "@/_lib/mock";
import { PreferenceCard } from "./_components/PreferenceCard";
import { ProfileCard } from "./_components/ProfileCard";
import { SettingRow } from "./_components/SettingRow";
import { APP_VERSION_LABEL } from "./_lib/constants";

/** MY 마이페이지 — 프로필·응원팀·환경설정·FAQ·로그아웃 (KAN-170, 피그마 26-6). */
export default function MyPage() {
  const team = TEAMS[CURRENT_USER.myTeam];

  return (
    <AppShell>
      <TopBar notif={3} />

      <ScrollArea>
        <div className="px-edge gap-gap-lg flex flex-col pt-3 pb-8">
          <ProfileCard user={CURRENT_USER} />

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

          <PreferenceCard />

          <section className="bg-elevate-2 border-border rounded-card border">
            <SettingRow
              pressable
              icon={<HelpCircleIcon />}
              label="FAQ"
              trailing={<ChevronMiniIcon className="text-text-4 shrink-0" />}
            />
          </section>

          <button
            type="button"
            className="border-border-strong text-danger rounded-control mt-2 flex w-full items-center justify-center gap-2 border py-3.5 active:opacity-60"
          >
            <LogoutIcon />
            <span className="text-body font-extrabold">로그아웃</span>
          </button>

          <p className="text-caption text-text-4 text-center">
            {APP_VERSION_LABEL}
          </p>
        </div>
      </ScrollArea>

      <TabBar />
    </AppShell>
  );
}
