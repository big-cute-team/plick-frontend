import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { EditTopBar } from "./_components/EditTopBar";

/** 프로필 수정 로딩 스켈레톤 — 초깃값 fetch(`GET /users/me`) 동안 자리를 잡아둔다. */
export default function ProfileEditLoading() {
  return (
    <AppShell>
      <EditTopBar />
      <ScrollArea>
        <div className="px-edge flex animate-pulse flex-col gap-4.5 pt-2.5 pb-10">
          <div className="bg-elevate rounded-pill mx-auto size-24" />
          <div className="bg-elevate rounded-card h-27" />
          <div className="bg-elevate rounded-card h-24" />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
