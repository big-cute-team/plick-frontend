import { AvatarField } from "@plick/ui/AvatarField";
import { SiteHeader } from "@/_components/SiteHeader";
import { CURRENT_USER, NOTIF_COUNT } from "@/_lib/mock";
import { FavoriteTeamPicker } from "./_components/FavoriteTeamPicker";
import { InfoCard } from "./_components/InfoCard";

/**
 * 데스크톱 프로필 수정 (KAN-245) — 마이페이지 프로필 카드에서 진입(`/me/edit`).
 * GNB + 중앙 정렬 좁은 컬럼(max-w-narrow)에 아바타·기본정보·응원팀 선택·저장. 피그마 W5(node 207-2).
 *
 * 아바타는 모바일에서 승격한 `@plick/ui/AvatarField` 공용 컴포넌트를 그대로 쓴다.
 */
export default function ProfileEditPage() {
  const user = CURRENT_USER;

  return (
    <>
      <SiteHeader notif={NOTIF_COUNT} />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <h1 className="text-hero text-text tracking-heading font-bold">
            프로필 수정
          </h1>

          <div className="gap-gap-lg flex flex-col pt-5.5">
            <AvatarField />
            <InfoCard nickname={user.nickname} email={user.email} />
            <FavoriteTeamPicker initial={user.myTeam} />
          </div>
        </div>
      </main>
    </>
  );
}
