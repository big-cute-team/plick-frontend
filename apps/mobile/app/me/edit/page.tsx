import { redirect } from "next/navigation";
import { AvatarField } from "@plick/ui/AvatarField";
import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { ScrollArea } from "@/_components/ScrollArea";
import { getMyProfile } from "@/_lib/api/profile";
import { EditTopBar } from "./_components/EditTopBar";
import { InfoCard } from "./_components/InfoCard";
import { TeamPicker } from "./_components/TeamPicker";

/**
 * 프로필 수정 — 마이페이지 프로필 카드 진입 (KAN-173, 피그마 25-6).
 * 초깃값은 `GET /users/me`(KAN-267). 저장(PATCH)은 다음 티켓 몫이라 아직 미연결.
 */
export default async function ProfileEditPage() {
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/login"); // 내 정보 화면이라 비로그인 진입이 성립하지 않는다
  }

  return (
    <AppShell>
      <EditTopBar />

      <ScrollArea>
        <div className="px-edge flex flex-col gap-4.5 pt-2.5 pb-10">
          <AvatarField />
          <InfoCard nickname={profile.nickname} email={profile.email} />
          {/* 응원팀은 다중이지만 수정 UI는 아직 단일 선택 — 다중 편집은 PATCH 연동 티켓에서 */}
          <TeamPicker initial={profile.myTeams[0] ?? null} />

          <PrimaryButton>변경사항 저장</PrimaryButton>
        </div>
      </ScrollArea>
    </AppShell>
  );
}
