import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";

/** 계정 로딩 스켈레톤. 초깃값 fetch(`GET /users/me`) 동안 행 세 개 자리를 잡아둔다. */
export default function ProfileEditLoading() {
  return (
    <AppShell>
      <SubTopBar title="계정" backHref="/me" />
      <ScrollArea>
        <div className="px-edge animate-pulse pt-1.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="border-border-soft flex min-h-13.5 items-center gap-2.5 border-b"
            >
              <div className="bg-elevate rounded-pill h-3.5 w-12" />
              <div className="bg-elevate rounded-pill h-4 w-32" />
            </div>
          ))}
        </div>
      </ScrollArea>
    </AppShell>
  );
}
