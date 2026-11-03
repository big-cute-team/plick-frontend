import { formatRelativeTime } from "@plick/domain/format";
import type { Story } from "@plick/domain/types";

/**
 * 이슈 머리 (KAN-709, 웹 `StoryHeader`의 모바일 판). 이슈 제목 23/900과 그 밑 부제 12.5 보조색
 * (기사 수, 마지막 기사 시각)이다. 시안에 이슈 화면은 없어 인물 프로필 머리(`FigureHeader`)의
 * 글자 크기를 따랐다. 나열은 쉼표다.
 *
 * 이슈에는 사진이 없어 글자만 둔다. BE가 주는 이미지는 최신 기사 사진이라 이슈를 대표하지 못한다.
 * 제목은 어드민이 고칠 수 있는 문장이라 길 수 있어 자르지 않고 줄을 넘긴다.
 *
 * @param story 이슈 한 건
 */
export function StoryHeader({ story }: { story: Story }) {
  return (
    <header className="px-edge pt-5 pb-1">
      <h1 className="text-profile tracking-title text-text-strong font-black break-keep">
        {story.title}
      </h1>
      <p className="text-label-lg text-text-3 mt-1.5">
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
