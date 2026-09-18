import Link from "next/link";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 이슈 없음 화면 (KAN-523) — 없거나 어드민이 숨긴 이슈 딥링크의
 * 정상 경로다. BE 404 `STORY_NOT_FOUND`와 정수가 아닌 id의 400을 페이지가
 * `notFound()`로 보내면 Next가 세그먼트를 이 화면으로 대체한다. 모양은 인물
 * 없음 화면과 같다.
 */
export default function StoryNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center justify-center gap-7 px-6 py-40">
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-headline text-text font-extrabold">
            이슈를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3 font-semibold">
            없어졌거나 내려간 이슈예요
          </p>
        </div>
        <Link
          href="/"
          className="bg-accent text-on-accent rounded-pill text-body-lg focus-visible:outline-accent flex h-13 w-full max-w-60 items-center justify-center font-extrabold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80"
        >
          홈으로
        </Link>
      </main>
    </>
  );
}
