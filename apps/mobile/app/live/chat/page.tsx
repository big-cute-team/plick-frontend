import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHAT_ENABLED } from "@plick/core/chat";
import { AppShell } from "@/_components/AppShell";
import { SubTopBar } from "@/_components/SubTopBar";
import { LiveChatPanel } from "@/live/_components/LiveChatPanel";

/** 로그인해야 보이는 대화 지면이라 색인 가치가 없다. */
export const metadata: Metadata = {
  title: "채팅방",
  robots: { index: false, follow: false },
};

/**
 * 통합 채팅방 라우트 (KAN-572). LIVE 목록 맨 위 배너로 들어온다. 방이 경기와
 * 무관하게 언제나 열린 하나라, 경기 상세 채팅 탭을 거치지 않고 바로 들어오는
 * 자리가 필요해 따로 세웠다. 경기 상세 채팅 탭과 같은 패널이고 같은 방이다.
 *
 * 경기 상세 채팅 탭처럼 입력바가 화면 하단에 붙어야 해서 하단 탭바를 두지 않고,
 * 상단바 아래 남는 높이를 패널이 다 가져간다(목록만 안에서 스크롤).
 */
export default function LiveChatPage() {
  if (!CHAT_ENABLED) notFound();

  return (
    <AppShell>
      <SubTopBar title="채팅방" backHref="/live" backBehavior="back" />
      <div className="flex min-h-0 flex-1 flex-col">
        <LiveChatPanel />
      </div>
    </AppShell>
  );
}
