import { redirect } from "next/navigation";
import { AvatarField } from "@plick/ui/AvatarField";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { getMyProfile } from "@/_services/profile";
import { EditTopBar } from "./_components/EditTopBar";
import { InfoCard } from "./_components/InfoCard";
import { ProfileEditForm } from "./_components/ProfileEditForm";

/**
 * 프로필 수정 — 마이페이지 프로필 카드 진입 (KAN-173, 피그마 25-6).
 * 초깃값은 `GET /users/me`(KAN-267), 저장은 `PATCH /users/me` — 응원팀(KAN-268)에
 * 닉네임(KAN-269)까지 한 번에 보낸다. 이메일은 표시 전용.
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
          <div className="flex flex-col items-center gap-2.5">
            <AvatarField />
            <p className="text-body-lg text-text font-extrabold">
              {profile.nickname ?? "미설정"}
            </p>
          </div>
          <InfoCard email={profile.email} />
          <ProfileEditForm
            currentNickname={profile.nickname}
            nicknameChangeableAt={profile.nicknameChangeableAt}
            initialTeams={profile.myTeams}
          />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
