import type { Metadata } from "next";
import { ApiError } from "@plick/core/client";
import { TEAMS } from "@plick/domain/constants";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { activityTabFrom } from "@/_constants/me";
import {
  getLikedArticles,
  getMyActivityCounts,
  getMyComments,
} from "@/_services/activity";
import { getMyProfile } from "@/_services/profile";
import { getAccessToken, getGuestExpiresAt } from "@/_services/session";
import type { InitialActivity } from "@/_types/activity";
import { ActivityEmpty } from "./_components/ActivityEmpty";
import { ActivityTabs } from "./_components/ActivityTabs";
import { GuestLinkCard } from "./_components/GuestLinkCard";
import { LikedArticlesList } from "./_components/LikedArticlesList";
import { LoginPromptCard } from "./_components/LoginPromptCard";
import { MeShell } from "./_components/MeShell";
import { MyCommentsList } from "./_components/MyCommentsList";

/** 개인화 화면이라 색인 가치가 없다. robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "MY",
  robots: { index: false, follow: false },
};

/**
 * 데스크톱 MY, 내 활동 (KAN-244 → KAN-319 API 연결 → KAN-567 리디자인, 시안 MY
 * 575-680행). 좌측 메뉴(`MeShell`) 옆에 닉네임 22/900, 응원팀 엠블럼, 오른쪽에
 * "댓글 N, 좋아요 N"을 두고 그 아래 내 댓글, 좋아요, 내 투표 탭과 목록을 쌓는다.
 * 전에는 설정 줄 카드만 있었고 활동 목록은 모바일에만 있었다. 모바일
 * `/me/activity`의 훅, fetcher를 이식했다.
 *
 * 프로필은 `GET /users/me`로 읽는다(모바일 KAN-267과 같은 계약). null이면 비로그인으로
 * 보고 로그인 안내를 그린다. 게스트는 세 번째 갈래다 (KAN-514). 프로필이 있으니
 * 비로그인 안내를 띄울 수 없고, 그렇다고 소셜 사용자와 같은 화면을 줄 수도 없다.
 * 닉네임이 자동 부여값이고 활동, 로그아웃, 탈퇴는 연동 전에는 뜻이 없다. 그래서
 * 연동 안내만 그린다.
 *
 * 활동 개수와 지금 보는 탭(`?tab=`)의 첫 페이지를 여기서 미리 받아 씨앗으로
 * 내려준다. 어느 탭이든 첫 화면이 서버 HTML에 실려 스켈레톤 없이 뜬다. 투표 탭은
 * 내 투표 목록 API가 없어 빈 상태만 둔다. 활동 조회가 401이면 토큰이 무효한 것이라
 * 비로그인과 같이 다루고, 그 밖의 실패는 씨앗 없이 넘겨 클라가 다시 받는다.
 *
 * @param searchParams `tab` 쿼리. 없거나 모르는 값이면 내 댓글 탭
 */
export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tab = activityTabFrom((await searchParams).tab);
  const profile = await getMyProfile();
  const guestExpiresAt = await getGuestExpiresAt();
  const isGuest = profile?.isGuest ?? false;

  if (!profile) {
    return (
      <MeShell nav={false}>
        <LoginPromptCard />
      </MeShell>
    );
  }
  if (isGuest) {
    return (
      <MeShell nav={false}>
        <GuestLinkCard guestExpiresAt={guestExpiresAt} />
      </MeShell>
    );
  }

  let initial: InitialActivity | undefined;
  const accessToken = await getAccessToken();
  if (accessToken) {
    try {
      const [counts, page] = await Promise.all([
        getMyActivityCounts(accessToken),
        tab === "likes"
          ? getLikedArticles({ accessToken })
          : tab === "comments"
            ? getMyComments({ accessToken })
            : Promise.resolve(undefined),
      ]);
      initial = {
        counts,
        likes: tab === "likes" ? (page as InitialActivity["likes"]) : undefined,
        comments:
          tab === "comments"
            ? (page as InitialActivity["comments"])
            : undefined,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return (
          <MeShell nav={false}>
            <LoginPromptCard />
          </MeShell>
        );
      }
      console.error("[me] 활동 초기 로드 실패:", error);
    }
  }

  return (
    <MeShell>
      <div className="flex flex-wrap items-center gap-3 pb-5.5">
        <h1 className="text-section text-text-strong tracking-title font-black">
          {profile.nickname ?? "닉네임 미설정"}
        </h1>
        <div className="flex gap-1.25">
          {profile.myTeams.map((code) => (
            <TeamCrest key={code} team={TEAMS[code]} size={20} />
          ))}
        </div>
        {initial && (
          <span className="text-label-lg text-text-3 ml-auto">
            댓글 {initial.counts.commentCount}, 좋아요{" "}
            {initial.counts.likeCount}
          </span>
        )}
      </div>

      <ActivityTabs active={tab} />

      {tab === "comments" ? (
        <MyCommentsList
          initial={
            initial?.comments && {
              page: initial.comments,
              fetchedAt: initial.fetchedAt,
            }
          }
        />
      ) : tab === "likes" ? (
        <LikedArticlesList
          initial={
            initial?.likes && {
              page: initial.likes,
              fetchedAt: initial.fetchedAt,
            }
          }
        />
      ) : (
        <ActivityEmpty tab="votes" />
      )}
    </MeShell>
  );
}
