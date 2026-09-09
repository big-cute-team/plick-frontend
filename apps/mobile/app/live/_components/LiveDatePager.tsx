"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { shiftDateKey } from "@plick/domain/live";
import { SwipePager } from "@/_components/SwipePager";
import { LiveMatchesFeed } from "./LiveMatchesFeed";

/**
 * 경기 목록을 좌우로 끌어 전날·다음날로 넘어가는 페이저 (KAN-462). 왼쪽으로
 * 끌면 다음날이 오른쪽에서 들어온다(날짜 스트립과 같은 방향). 날짜는 양쪽으로
 * 끝이 없어 이웃 판정은 하루씩 옮기기만 한다.
 *
 * 커밋은 날짜 스트립의 칸을 누른 것과 같은 소프트 내비게이션(`router.push`)이다.
 * 날짜는 `/live?date=` 쿼리가 정본이라(ADR 0127) URL을 바꾸면 페이지가 서버에서
 * 새 날짜의 씨앗을 받아 내려오고, `date` prop이 바뀌는 순간 페이저가 트랙을
 * 걷는다. 그 사이에는 미리보기 페인이 그 날짜 쿼리를 클라에서 먼저 받아 그리고
 * 있어, 서버 왕복이 늦어도 빈 화면이 아니라 이웃 날짜 목록이 보인다. 커밋 뒤
 * 진짜 페인의 쿼리는 미리보기가 채운 캐시를 그대로 쓴다.
 *
 * @param date 보고 있는 날짜 키
 * @param today KST 오늘. 오늘은 쿼리 없는 `/live`가 정본이라 href를 가른다
 */
export function LiveDatePager({
  date,
  today,
  children,
}: {
  date: string;
  today: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <SwipePager
      value={date}
      neighborOf={(value, dir) => shiftDateKey(value, dir)}
      onCommit={(next) =>
        router.push(next === today ? "/live" : `/live?date=${next}`)
      }
      renderPreview={(neighbor) => <LiveMatchesFeed date={neighbor} />}
    >
      {children}
    </SwipePager>
  );
}
