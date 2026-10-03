import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { getMyProfile } from "@/_services/profile";
import { ProfileEditForm } from "./_components/ProfileEditForm";

/** 개인화 화면이라 색인 가치가 없다. robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "계정",
  robots: { index: false, follow: false },
};

/**
 * 계정 (KAN-173, KAN-567 리디자인, 시안 MY 계정). MY의 "계정" 행에서 들어온다.
 * 닉네임·이메일·응원팀을 라벨 + 값 행으로 쌓고 닉네임과 응원팀 행 오른쪽의
 * "수정"이 인라인 편집을 연다. 아바타와 카드 섀시는 걷어냈다.
 * 초깃값은 `GET /users/me`(KAN-267), 저장은 `PATCH /users/me`(응원팀 KAN-268,
 * 닉네임 KAN-269)을 한 번에 보낸다. 이메일은 표시 전용.
 */
export default async function ProfileEditPage() {
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/login"); // 내 정보 화면이라 비로그인 진입이 성립하지 않는다
  }

  return (
    <AppShell>
      <SubTopBar title="계정" backHref="/me" />

      <ScrollArea>
        <div className="px-edge pt-1.5 pb-10">
          <ProfileEditForm
            currentNickname={profile.nickname}
            nicknameChangeableAt={profile.nicknameChangeableAt}
            email={profile.email}
            initialTeams={profile.myTeams}
          />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
