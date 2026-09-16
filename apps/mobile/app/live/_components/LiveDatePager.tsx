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
 * 제스처를 받는 컨테이너는 목록 높이가 아니라 남은 화면을 전부 차지한다
 * (`flex-1`). 카드 두세 장만 있는 날에는 목록 상자가 화면 위쪽 일부뿐이라,
 * 컨테이너를 내용 높이에 맞춰 두면 그 상자 위에서만 스와이프가 먹고 아래
 * 빈 자리는 죽은 영역이 된다. 부모가 `flex min-h-full flex-col`로 열어 둔
 * 높이를 여기서 받아 채운다.
 *
 * @param date 보고 있는 날짜 키
 * @param today KST 오늘. 오늘은 쿼리 없는 `/live`가 정본이라 href를 가른다
 * @param className 컨테이너에 더할 클래스. 경기 목록이 `flex-1`을 준다
 */
export function LiveDatePager({
  date,
  today,
  className = "",
  children,
}: {
  date: string;
  today: string;
  className?: string;
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
      className={className}
    >
      {children}
    </SwipePager>
  );
}
