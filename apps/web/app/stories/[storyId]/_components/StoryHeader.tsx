import { formatRelativeTime } from "@plick/domain/format";
import type { Story } from "@plick/domain/types";

/**
 * 이슈 머리 (KAN-523) — 이슈 제목, 기사 수, 마지막 기사 시각.
 *
 * 인물 프로필 머리(`FigureHeader`)와 같은 자리다. 이슈에는 사진이 없어 글자만
 * 둔다 — BE가 주는 이미지는 최신 기사 사진이라 이슈를 대표하지 못한다.
 * 제목은 어드민이 고칠 수 있는 문장이라 길 수 있어 자르지 않고 줄을 넘긴다.
 *
 * @param story 이슈 한 건
 */
export function StoryHeader({ story }: { story: Story }) {
  return (
    <header className="flex flex-col gap-2 pt-7 pb-5">
      <p className="text-label text-accent font-bold">이슈</p>
      <h1 className="text-hero text-text tracking-heading font-extrabold break-keep">
        {story.title}
      </h1>
      <p className="text-label text-text-3 flex items-center gap-2">
        <span>기사 {story.articleCount}건</span>
        {story.lastArticleAt && (
          <>
            <span aria-hidden className="text-text-4">
              ·
            </span>
            <span>마지막 기사 {formatRelativeTime(story.lastArticleAt)}</span>
          </>
        )}
      </p>
    </header>
  );
}
