import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { ACTIVITY_TABS } from "@/_constants/activity";
import { MyCommentSkeleton } from "@/me/_components/MyCommentSkeleton";

/** 활동 목록 자리에 깔 줄 수. `MyCommentsList`의 첫 로딩과 같다. */
const SKELETON_ROWS = 3;

/**
 * MY의 로딩 자리 (KAN-602). 프로필(`GET /users/me`)과 활동 첫 페이지를 기다리는
 * 동안 상단바, 닉네임과 개수 줄 뼈대, 활동 탭 라벨, 목록 뼈대를 먼저 그린다.
 * 로그인 여부를 아직 몰라 로그인 안내 대신 가장 흔한 로그인 화면 모양을 잡는다.
 *
 * 라우트 그룹 `(main)` 안에 둬 계정·차단 목록까지 이 뼈대로 덮지 않는다.
 */
export default function MyLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea restoreLanding={false}>
        <div aria-hidden className="px-edge animate-pulse pt-5 pb-4">
          <div className="bg-elevate rounded-pill h-7 w-32" />
          <div className="bg-elevate rounded-pill mt-2.5 h-3.5 w-40" />
        </div>
        <div
          aria-hidden
          className="border-border px-edge flex gap-5 border-b pt-4.5"
        >
          {ACTIVITY_TABS.map(({ key, label }) => (
            <span
              key={key}
              className="text-tab text-text-3 shrink-0 border-b-2 border-transparent pb-2.5 font-medium"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="px-edge">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <MyCommentSkeleton key={i} />
          ))}
        </div>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
