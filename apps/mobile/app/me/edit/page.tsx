import { AvatarField } from "@plick/ui/AvatarField";
import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { ScrollArea } from "@/_components/ScrollArea";
import { CURRENT_USER } from "@/_lib/mock";
import { EditTopBar } from "./_components/EditTopBar";
import { InfoCard } from "./_components/InfoCard";
import { TeamPicker } from "./_components/TeamPicker";

/** 프로필 수정 — 마이페이지 프로필 카드 진입 (KAN-173, 피그마 25-6). */
export default function ProfileEditPage() {
  const user = CURRENT_USER;

  return (
    <AppShell>
      <EditTopBar />

      <ScrollArea>
        <div className="px-edge flex flex-col gap-4.5 pt-2.5 pb-10">
          <AvatarField />
          <InfoCard user={user} />
          <TeamPicker initial={user.myTeam} />

          <PrimaryButton>변경사항 저장</PrimaryButton>
        </div>
      </ScrollArea>
    </AppShell>
  );
}
