/**
 * @file 모바일 앱 전용 타입. 도메인 타입(ArticleCard·Comment 등)은 `@plick/domain/types`.
 */
import type { ComponentType } from "react";

/**
 * 하단 탭 하나 — 경로·라벨·아이콘·활성 판정.
 *
 * `screen`은 이 탭이 여는 화면의 이름이다. 지금 있는 탭을 한 번 더 눌렀을 때
 * 어느 화면을 맨 위로 올릴지 찾는 데 쓴다 (KAN-314). 되돌릴 자리가 없는 탭은 비운다.
 *
 * 재탭 판정을 활성 판정보다 좁히는 `surface`는 기사 탭(KAN-386)만 쓰다가 기사
 * 탭이 LIVE로 대체되며(KAN-435) 같이 뺐다 — 세부 라우트에서도 활성으로 빛나는
 * 탭이 다시 생기면 그 커밋을 되살린다.
 */
export type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  match: (p: string) => boolean;
  screen?: ScreenKey;
};

/**
 * 떠났다 돌아와도 보던 자리를 되돌려 주는 화면의 이름 (KAN-314).
 * 뷰 상태 스토어의 키이자 {@link Tab}의 재탭 대상이다. 기사 세부처럼 매번
 * 새로 여는 화면은 되돌릴 자리가 없어 여기 없다.
 */
export type ScreenKey = "home" | "reels" | "articles" | "debate";
