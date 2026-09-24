import type { Metadata } from "next";
import Link from "next/link";
import { ApiError } from "@plick/core/client";
import { TEAMS } from "@plick/domain/constants";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { APP_VERSION_LABEL } from "@/_constants/me";
import {
  getLikedArticles,
  getMyActivityCounts,
  getMyComments,
} from "@/_services/activity";
import { getBlockedUsers } from "@/_services/blocks";
import { getMyProfile } from "@/_services/profile";
import { getAccessToken, getGuestExpiresAt } from "@/_services/session";
import type { InitialActivity } from "@/_types/activity";
import { activityTabFrom } from "@/_utils/activity";
import { ActivityScrollArea } from "./_components/ActivityScrollArea";
import { DeleteAccountButton } from "./_components/DeleteAccountButton";
import { LogoutButton } from "./_components/LogoutButton";
import { MeActivityFeed } from "./_components/MeActivityFeed";
import { MeHeader } from "./_components/MeHeader";
import { MeLinkRow } from "./_components/MeLinkRow";
import { MeLoginNotice } from "./_components/MeLoginNotice";

/** 개인화 화면이라 색인 가치가 없다. robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "MY",
  robots: { index: false, follow: false },
};

/** 스토어 심사용 문서 링크. 시안에는 없지만 심사 정책상 진입점을 남긴다. */
const DOC_LINKS = [
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
];

/**
 * MY (KAN-170, KAN-567 리디자인, 시안 MY 메인).
 *
 * 위에서부터 닉네임·응원팀 엠블럼·활동 개수, 계정과 차단 목록으로 들어가는 행,
 * 내 댓글 / 좋아요 / 투표 탭과 목록, 맨 아래 로그아웃과 회원 탈퇴다. 카드로 쌓던
 * 옛 구성(프로필·응원팀·활동 카드, 설정 줄)은 걷어냈고 활동 목록은 별도 화면
 * (`/me/activity`)에서 이 화면의 탭으로 들어왔다(그 주소는 여기로 redirect).
 *
 * 프로필은 `GET /users/me`로 읽는다(KAN-267). null이면 비로그인/토큰 무효로 보고
 * 상단에 로그인 안내를 둔다. 게스트는 세 번째 갈래다 (KAN-514). 프로필이 있으니
 * 비로그인 안내를 띄울 수 없고, 닉네임이 자동 부여값이라 소셜 사용자와 같은 화면을
 * 줄 수도 없다. 그래서 상단을 연동 안내로 바꾸고 소셜 전용 줄(계정·차단 목록·
 * 로그아웃·탈퇴)을 감춘다. 활동 탭은 남긴다. 좋아요와 댓글은 게스트도 쌓이고,
 * 그게 연동할 이유이기 때문이다.
 *
 * 개수와 지금 보는 탭(`?tab=`)의 첫 페이지를 여기서 미리 받아 씨앗으로 내려준다
 * (KAN-495). 어느 탭이든 첫 화면이 서버 HTML에 실려 스켈레톤 없이 뜬다. 활동
 * 조회가 실패해도 화면은 떠야 하므로 씨앗 없이 넘기고 목록이 클라에서 다시 받는다.
 * 쿠키는 있는데 토큰이 무효(401)면 비로그인과 같이 다룬다.
 *
 * @param searchParams `tab` 쿼리. 없거나 모르는 값이면 내 댓글 탭
 */
export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = activityTabFrom(tabParam);
  const [accessToken, guestExpiresAt, profile] = await Promise.all([
    getAccessToken(),
    getGuestExpiresAt(),
    getMyProfile(),
  ]);
  const isGuest = profile?.isGuest ?? false;
  const isSocial = profile !== null && !isGuest;
  let needsLogin = profile === null || !accessToken;

  let initial: InitialActivity | undefined;
  let blockedCount: number | null = null;

  if (accessToken && profile) {
    const [activity, blocked] = await Promise.allSettled([
      loadInitialActivity(accessToken, tab),
      isSocial ? getBlockedUsers() : Promise.resolve(null),
    ]);
    if (activity.status === "fulfilled") {
      initial = activity.value;
    } else if (
      activity.reason instanceof ApiError &&
      activity.reason.status === 401
    ) {
      needsLogin = true;
    } else {
      console.error("[me] 활동 초기 로드 실패:", activity.reason);
    }
    if (blocked.status === "fulfilled") {
      blockedCount = blocked.value?.length ?? null;
    } else {
      console.error("[me] 차단 목록 조회 실패:", blocked.reason);
    }
  }

  return (
    <AppShell>
      <TopBar />

      <ActivityScrollArea>
        {profile && !needsLogin ? (
          <MeHeader
            nickname={profile.nickname ?? "닉네임 미설정"}
            teams={profile.myTeams.map((code) => TEAMS[code])}
            counts={
              initial && {
                counts: initial.counts,
                fetchedAt: initial.fetchedAt,
              }
            }
          />
        ) : (
          <MeLoginNotice mode="login" guestExpiresAt={guestExpiresAt} />
        )}
        {isGuest && !needsLogin && (
          <MeLoginNotice mode="guest" guestExpiresAt={guestExpiresAt} />
        )}

        {isSocial && !needsLogin && (
          <nav className="px-edge">
            <MeLinkRow
              href="/me/edit"
              label="계정"
              value={profile?.email ?? undefined}
              className="border-border border-t"
            />
            <MeLinkRow
              href="/me/blocked"
              label="차단 목록"
              value={blockedCount === null ? undefined : `${blockedCount}명`}
              className="border-border-soft border-border border-t border-b"
            />
          </nav>
        )}

        <MeActivityFeed initial={initial} needsLogin={needsLogin} />

        <footer className="px-edge flex flex-col gap-5 pt-6.5 pb-8">
          {isSocial && !needsLogin && (
            <div className="flex gap-4.5">
              <LogoutButton />
              <DeleteAccountButton />
            </div>
          )}
          <div className="text-caption-lg text-text-3 flex gap-3.5">
            {DOC_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="active:opacity-60">
                {label}
              </Link>
            ))}
          </div>
          <p className="text-caption text-text-4">{APP_VERSION_LABEL}</p>
        </footer>
      </ActivityScrollArea>

      <TabBar />
    </AppShell>
  );
}

/**
 * 지금 보는 탭의 첫 페이지와 개수를 한 번에 받는다. 투표 탭은 목록 API가 없어
 * 개수만 받는다.
 *
 * @param accessToken 서버 fetch에 실을 토큰
 * @param tab 지금 보는 탭
 */
async function loadInitialActivity(
  accessToken: string,
  tab: ReturnType<typeof activityTabFrom>,
): Promise<InitialActivity> {
  const fetchedAt = Date.now();
  if (tab === "likes") {
    const [counts, likes] = await Promise.all([
      getMyActivityCounts(accessToken),
      getLikedArticles({ accessToken }),
    ]);
    return { counts, likes, fetchedAt };
  }
  if (tab === "comments") {
    const [counts, comments] = await Promise.all([
      getMyActivityCounts(accessToken),
      getMyComments({ accessToken }),
    ]);
    return { counts, comments, fetchedAt };
  }
  return { counts: await getMyActivityCounts(accessToken), fetchedAt };
}
