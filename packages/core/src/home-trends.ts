import { ApiError } from "./client";
import { getTrends } from "./trends";

/** STORY 미지원(400)인 배포에서만 구단 순위로 대체한다. */
export async function getHomeTrends() {
  try {
    return await getTrends("STORY");
  } catch (error) {
    if (error instanceof ApiError && error.status === 400)
      return getTrends("TEAM");
    throw error;
  }
}
