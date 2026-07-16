import { SaveIcon, SendIcon } from "@plick/ui/icons";
import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 기사 세부 상단바 — 좌측 뒤로가기 + 우측 저장·공유 아이콘.
 *
 * 로고 대신 액션만 있는 얇은 크롬(피그마 S1 301:5). 저장·공유 버튼은 정적
 * 렌더라 서버 컴포넌트로 둔다(BE 연동 시 토글 핸들러를 붙인다).
 *
 * @param saved - 저장 상태(북마크 아이콘을 채움)
 */
export function ArticleTopBar({ saved }: { saved?: boolean }) {
  return (
    <TopBarShell innerClassName="justify-between">
      <BackButton href="/" />
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="저장"
          className="rounded-control text-icon grid size-9 place-items-center active:opacity-60"
        >
          <SaveIcon size={19} filled={saved} />
        </button>
        <button
          type="button"
          aria-label="공유"
          className="rounded-control text-icon grid size-9 place-items-center active:opacity-60"
        >
          <SendIcon size={19} />
        </button>
      </div>
    </TopBarShell>
  );
}
