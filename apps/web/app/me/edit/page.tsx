import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/_services/profile";
import { MeShell } from "@/me/_components/MeShell";
import { ProfileEditForm } from "./_components/ProfileEditForm";

/** 개인화 화면이라 색인 가치가 없다. robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "계정",
  robots: { index: false, follow: false },
};

/**
 * 데스크톱 계정 화면 (KAN-245 → KAN-319 API 연결 → KAN-567 리디자인, 시안 MY 683-716행).
 * MY 좌측 메뉴의 "계정"이고, 닉네임, 이메일, 응원팀을 라벨 96px 행으로 늘어놓는다.
 * 닉네임과 응원팀 행의 "수정하기"를 누르면 그 자리에서 편집한다(`ProfileEditForm`).
 * 아바타는 시안 규칙(프로필 이미지 없음)대로 지웠다.
 *
 * 초깃값은 `GET /users/me`, 저장은 `PATCH /users/me`. 응원팀(다중)에 닉네임까지
 * 한 번에 보낸다(모바일 KAN-268, KAN-269와 같은 계약). 이메일은 표시 전용이다.
 */
export default async function ProfileEditPage() {
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/login"); // 내 정보 화면이라 비로그인 진입이 성립하지 않는다
  }

  return (
    <MeShell>
      <h1 className="text-section text-text-strong tracking-title pb-5.5 font-black">
        계정
      </h1>
      <ProfileEditForm
        currentNickname={profile.nickname}
        nicknameChangeableAt={profile.nicknameChangeableAt}
        email={profile.email}
        initialTeams={profile.myTeams}
      />
    </MeShell>
  );
}
