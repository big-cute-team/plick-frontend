import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { APP_VERSION_LABEL } from "@/_constants/me";

/**
 * MY 로딩 스켈레톤 — 프로필 fetch(`GET /users/me`) 동안 로그인 상태의 실제
 * 구성대로 자리를 잡아둔다: 프로필 카드 / 응원팀 카드 / 환경설정 / FAQ /
 * 로그아웃 버튼. 버전 문구는 정적이라 실물을 그대로 그린다.
 *
 * 카드 높이는 실측 기준: 프로필 86 / 응원팀(칩 1줄) 108 / 설정·FAQ 줄 62 /
 * 로그아웃 50 (KAN-301에서 실제 레이아웃과 맞췄다).
 */
export default function MyLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea>
        <div className="px-edge gap-gap-lg flex animate-pulse flex-col pt-3 pb-8">
          <div className="bg-elevate rounded-card h-21.5" />
          <div className="bg-elevate rounded-card h-27" />
          <div className="bg-elevate rounded-card h-15.5" />
          <div className="bg-elevate rounded-card h-15.5" />
          <div className="bg-elevate rounded-control mt-2 h-12.5" />
          <p className="text-caption text-text-4 text-center">
            {APP_VERSION_LABEL}
          </p>
        </div>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}
