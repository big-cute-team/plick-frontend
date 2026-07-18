import type { ReactNode } from "react";
import {
  ChevronMiniIcon,
  HelpCircleIcon,
  LogoutIcon,
  TeamShieldIcon,
} from "@plick/ui/icons";
import { PreferenceCard } from "@plick/ui/PreferenceCard";
import { ProfileCard } from "@plick/ui/ProfileCard";
import { SettingRow } from "@plick/ui/SettingRow";
import { SiteHeader } from "@/_components/SiteHeader";
import { TEAMS } from "@plick/domain/constants";
import { CURRENT_USER, NOTIF_COUNT } from "@/_lib/mock";
import { APP_VERSION_LABEL } from "./_lib/constants";

/**
 * 데스크톱 마이페이지 (KAN-244) — GNB + 중앙 정렬 좁은 컬럼(max-w-narrow)에
 * 프로필·응원팀·환경설정(알림·다크 모드)·FAQ·로그아웃. 피그마 W4(node 208-2).
 *
 * 카드·토글·설정 줄은 모바일에서 승격한 `@plick/ui` 공용 컴포넌트를 그대로 쓴다.
 */
export default function MyPage() {
  const team = TEAMS[CURRENT_USER.myTeam];

  return (
    <>
      <SiteHeader notif={NOTIF_COUNT} />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <h1 className="text-hero text-text tracking-heading font-extrabold">
            MY
          </h1>

          <div className="gap-gap-lg flex flex-col pt-5.5">
            <ProfileCard
              nickname={CURRENT_USER.nickname}
              handle={CURRENT_USER.handle}
              href="/me/edit"
            />

            <CardSection>
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
            </CardSection>

            <PreferenceCard />

            <CardSection>
              <SettingRow
                pressable
                icon={<HelpCircleIcon />}
                label="FAQ"
                trailing={<ChevronMiniIcon className="text-text-4 shrink-0" />}
              />
            </CardSection>

            <button
              type="button"
              className="border-border-strong text-danger rounded-control focus-visible:outline-accent hover:bg-elevate mt-2 flex w-full items-center justify-center gap-2 border py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
            >
              <LogoutIcon />
              <span className="text-body font-extrabold">로그아웃</span>
            </button>

            <p className="text-caption text-text-4 text-center">
              {APP_VERSION_LABEL}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

/** 설정 줄 하나를 감싸는 카드 섀시 — 이 화면에서만 쓰는 사적 헬퍼. */
function CardSection({ children }: { children: ReactNode }) {
  return (
    <section className="bg-elevate-2 border-border rounded-card overflow-hidden border">
      {children}
    </section>
  );
}
