import { redirect } from "next/navigation";
import { getMyProfile } from "@/_services/profile";
import { NicknameForm } from "./_components/NicknameForm";

/**
 * W8 온보딩 닉네임 설정(1/2) — 다크 배경 중앙 카드로 닉네임을 입력받는다.
 * KAN-247 퍼블리싱, KAN-320 API 연결. 피그마 225-2.
 * 초깃값은 `GET /users/me`의 닉네임 — BE가 자동 닉네임(plick+숫자)을 주면
 * 그대로 채워 시작하고, 아직 null이면 빈 값으로 시작한다.
 */
export default async function OnboardingNicknamePage() {
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/login"); // 온보딩은 가입 직후 흐름 — 세션 없이는 저장도 못 한다
  }

  return <NicknameForm initial={profile.nickname ?? ""} />;
}
