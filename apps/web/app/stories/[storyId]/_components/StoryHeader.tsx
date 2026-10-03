import { formatRelativeTime } from "@plick/domain/format";
import type { Story } from "@plick/domain/types";

/**
 * 이슈 머리 (KAN-523, 시안 KAN-567 프로필 머리 톤) — 이슈 제목 30/900과 그 밑
 * 부제 12px 보조색(기사 수, 마지막 기사 시각). 시안에 이슈 화면은 없어 웹 프로필
 * 머리(이름 30/900, 부제 12)를 따랐다. 나열은 쉼표다.
 *
 * 이슈에는 사진이 없어 글자만 둔다 — BE가 주는 이미지는 최신 기사 사진이라
 * 이슈를 대표하지 못한다. 제목은 어드민이 고칠 수 있는 문장이라 길 수 있어
 * 자르지 않고 줄을 넘긴다.
 *
 * @param story 이슈 한 건
 */
export function StoryHeader({ story }: { story: Story }) {
  return (
    <header className="flex flex-col gap-1.5 pb-5">
      <h1 className="text-read-title text-text-strong tracking-title font-black break-keep">
        {story.title}
      </h1>
      <p className="text-label text-text-3">
        기사 {story.articleCount}건
        {story.lastArticleAt && (
          <span suppressHydrationWarning>
            , 마지막 기사 {formatRelativeTime(story.lastArticleAt)}
          </span>
        )}
      </p>
    </header>
  );
}
