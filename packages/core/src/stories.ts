/**
 * @file 이슈 fetcher (KAN-522 `GET /api/v1/stories/{storyId}`).
 *
 * 이슈는 같은 이적설을 다룬 기사들을 BE가 하나로 묶은 단위다. 이 fetcher는
 * 머리 정보(제목·기사 수·마지막 기사 시각)만 받고, 기사 목록은 피드의
 * `?storyId=` 필터(`articles.ts`의 `getArticles`)로 따로 받는다.
 *
 * 익명 허용 공개 API라 토큰을 싣지 않는다(급상승·인물 프로필과 같은 판단).
 */

import type { Story } from "@plick/domain/types";
import { apiFetch } from "./client";

/** BE 응답 (dev 실응답으로 확인한 그대로). */
interface StoryResponse {
  storyId: number;
  title: string;
  articleCount: number;
  lastArticleAt: string | null;
}

/**
 * 이슈 한 건.
 *
 * @param storyId 라우트 파라미터 그대로의 이슈 id (BE는 int64 정수)
 * @throws {ApiError} 없는 id와 어드민이 숨긴 이슈는 똑같이 404
 *   `STORY_NOT_FOUND`, 정수가 아니면 400 `COMMON_INVALID_PARAM` — 호출부가
 *   잡아 not-found로 보낸다.
 */
export async function getStory(storyId: string): Promise<Story> {
  const story = await apiFetch<StoryResponse>(
    `/api/v1/stories/${encodeURIComponent(storyId)}`,
  );
  return {
    id: String(story.storyId),
    title: story.title,
    articleCount: story.articleCount,
    lastArticleAt: story.lastArticleAt,
  };
}
