import type { Metadata } from "next";
import { ApiError } from "@plick/core/client";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import {
  getLikedArticles,
  getMyActivityCounts,
  getMyComments,
} from "@/_services/activity";
import { getAccessToken } from "@/_services/session";
import type { InitialActivity } from "@/_types/activity";
import { activityTabFrom } from "@/_utils/activity";
import { ActivityFeed } from "./_components/ActivityFeed";
import { ActivityLoginPrompt } from "./_components/ActivityLoginPrompt";
import { ActivityScrollArea } from "./_components/ActivityScrollArea";
import { ActivityTopBar } from "./_components/ActivityTopBar";

/** 개인화 화면이라 색인 가치가 없다. robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "내 활동",
  robots: { index: false, follow: false },
};

/**
 * 내 활동 화면 (KAN-495). 마이페이지 활동 카드에서 들어온다. 좋아요한 기사와
 * 내가 쓴 댓글을 탭으로 나눠 무한스크롤로 보여주고, 탭 라벨에 활동 개수를 단다.
 *
 * 개수와 지금 보는 탭(`?tab=`)의 첫 페이지를 여기서 미리 받아 씨앗으로
 * 내려준다. 어느 탭이든 첫 화면이 서버 HTML에 실려 스켈레톤 없이 뜬다.
 *
 * 비로그인이면 목록 대신 로그인 카드다. 차단 목록처럼 로그인으로 redirect하지
 * 않는 이유는 티켓이 "활동 리스트 대신 유도 화면"을 요구해서다. 쿠키는 있는데
 * 토큰이 무효(401)인 경우도 같은 카드로 받는다. 그 밖의 실패(BE 다운 등)는
 * 씨앗 없이 넘겨 클라가 직접 받으며 리스트 자리에 에러와 재시도를 보여준다.
 *
 * @param searchParams `tab` 쿼리. 없거나 모르는 값이면 좋아요 탭
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = activityTabFrom(tabParam);
  const accessToken = await getAccessToken();

  let initial: InitialActivity | undefined;
  let needsLogin = !accessToken;

  if (accessToken) {
    try {
      if (tab === "likes") {
        const [counts, likes] = await Promise.all([
          getMyActivityCounts(accessToken),
          getLikedArticles({ accessToken }),
        ]);
        initial = { counts, likes, fetchedAt: Date.now() };
      } else {
        const [counts, comments] = await Promise.all([
          getMyActivityCounts(accessToken),
          getMyComments({ accessToken }),
        ]);
        initial = { counts, comments, fetchedAt: Date.now() };
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        needsLogin = true;
      } else {
        console.error("[activity] 활동 초기 로드 실패:", error);
      }
    }
  }

  if (needsLogin) {
    return (
      <AppShell>
        <ActivityTopBar />
        <ScrollArea>
          <div className="px-edge pt-4 pb-8">
            <ActivityLoginPrompt />
          </div>
        </ScrollArea>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ActivityTopBar />
      <ActivityScrollArea>
        <ActivityFeed initial={initial} />
      </ActivityScrollArea>
    </AppShell>
  );
}
