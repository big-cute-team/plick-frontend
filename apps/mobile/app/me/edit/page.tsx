import { redirect } from "next/navigation";
import { AvatarField } from "@plick/ui/AvatarField";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { getMyProfile } from "@/_lib/api/profile";
import { EditTopBar } from "./_components/EditTopBar";
import { InfoCard } from "./_components/InfoCard";
import { NicknameEditField } from "./_components/NicknameEditField";
import { ProfileEditForm } from "./_components/ProfileEditForm";

/**
 * 프로필 수정 — 마이페이지 프로필 카드 진입 (KAN-173, 피그마 25-6).
 * 초깃값은 `GET /users/me`(KAN-267), 응원팀 저장은 `PATCH /users/me`(KAN-268).
 * 닉네임·이메일은 표시 전용이라 보내지 않는다.
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
          <NicknameEditField />
          <ProfileEditForm initialTeams={profile.myTeams} />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
