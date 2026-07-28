import Link from "next/link";
import { redirect } from "next/navigation";
import { AvatarField } from "@plick/ui/AvatarField";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { SiteHeader } from "@/_components/SiteHeader";
import { getMyProfile } from "@/_services/profile";
import { InfoCard } from "./_components/InfoCard";
import { ProfileEditForm } from "./_components/ProfileEditForm";

/**
 * 데스크톱 프로필 수정 (KAN-245 → KAN-319 API 연결) — 마이페이지 프로필 카드에서
 * 진입(`/me/edit`). GNB + 중앙 정렬 좁은 컬럼(max-w-narrow).
 * 초깃값은 `GET /users/me`, 저장은 `PATCH /users/me` — 응원팀(다중)에 닉네임까지
 * 한 번에 보낸다(모바일 KAN-268·KAN-269와 같은 계약). 이메일은 표시 전용.
 */
export default async function ProfileEditPage() {
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/login"); // 내 정보 화면이라 비로그인 진입이 성립하지 않는다
  }

  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          {/* 저장 없이 나가는 명시적 경로 — 모바일 상단바 뒤로가기의 데스크톱 대응 */}
          <Link
            href="/me"
            className="text-label text-text-3 hover:text-text focus-visible:ring-accent inline-flex items-center gap-1 rounded-sm font-semibold focus-visible:ring-2 focus-visible:outline-none active:opacity-60"
          >
            <ChevronMiniIcon className="rotate-180" />
            MY
          </Link>
          <h1 className="text-hero text-text tracking-heading pt-3 font-bold">
            프로필 수정
          </h1>

          <div className="gap-gap-lg flex flex-col pt-5.5">
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
        </div>
      </main>
    </>
  );
}
