"use client";

import { LIVE_SEASON_LABEL, type TeamSquad } from "@plick/domain/live";
import type { FigureTag } from "@plick/domain/types";
import { TEAM_PROFILE_TAB_LABEL } from "@/_constants/team-profile";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import { useViewState } from "@/_stores/view-state";
import { SquadGrid } from "./SquadGrid";
import { TeamFiguresList } from "./TeamFiguresList";

/**
 * 팀 프로필 본문 탭 (KAN-484) — 선수단과 기사에 나온 인물을 주제별로 가른다.
 *
 * KAN-507에서 두 명단을 한 장에 합쳤는데, 섹션을 위아래로 쌓다 보니 선수단
 * 33명을 다 지나야 인물 목록이 나왔다. 둘은 출처도 쓰임도 다른 목록이라(한쪽은
 * 이번 시즌 등록 명단, 다른 쪽은 기사에서 뽑은 인물 사전) 한 화면에 같이 있을
 * 이유는 있어도 세로로 이어 붙일 이유는 없었다. 경기 상세와 같은 탭 줄로 나눈다.
 *
 * 탭은 URL로 승격하지 않는다 — 경기 상세 탭과 같은 판단이고 (ADR 0126 스토리 2),
 * 팀 프로필의 색인 대상은 팀 자체지 탭이 아니다. 대신 두 목록 다 첫 HTML에
 * 들어간다(서버가 받아 넘긴 값을 그대로 그린다).
 *
 * 다만 고른 탭은 `useState`가 아니라 `useViewState`에 둔다 (KAN-514). 인물 탭에서
 * 선수를 눌러 프로필로 들어가면 이 화면의 React 트리가 통째로 언마운트되고,
 * 뒤로 나올 때 다시 마운트되면서 초깃값인 선수단 탭으로 돌아가 있었다. Router
 * Cache는 RSC 페이로드만 들고 있지 컴포넌트 상태는 보존하지 않아서, 트리 밖에
 * 두는 것 말고는 방법이 없다 — 스크롤 위치를 거기 둔 것과 같은 이유다.
 *
 * 선수단 fetch만 실패하면 그 탭 자리에만 실패를 보여준다 — 라이브 API는 외부
 * (API-Football) 의존이라 인물 사전보다 덜 미덥고, 인물 탭까지 죽일 이유가 없다.
 *
 * @param slug 팀 slug. 탭 전환 이벤트의 ref (KAN-543)
 * @param squad 이번 시즌 등록 명단. 못 받았으면 null
 * @param figures 기사에서 뽑은 소속 인물
 */
export function TeamProfileTabs({
  slug,
  squad,
  figures,
}: {
  slug: string;
  squad: TeamSquad | null;
  figures: FigureTag[];
}) {
  const active = useViewState((state) => state.teamProfileTab);
  const setActive = useViewState((state) => state.setTeamProfileTab);
  /* 탭 전환은 서버 요청이 없어 여기서 화면 전환으로 센다 (KAN-543) */
  useScreenTabView("team_profile", active, slug);

  return (
    <>
      <div
        role="tablist"
        aria-label="팀 프로필 보기"
        className="border-border px-edge flex border-b"
      >
        {(["squad", "figures"] as const).map((key) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(key)}
              className={`text-body flex-1 border-b-2 pt-2 pb-2.5 font-bold ${
                on
                  ? "border-accent text-accent"
                  : "text-text-4 border-transparent"
              }`}
            >
              {TEAM_PROFILE_TAB_LABEL[key]}
            </button>
          );
        })}
      </div>

      {active === "squad" ? (
        squad ? (
          <>
            {/* 외부 명단이라 이적 반영이 늦을 수 있다는 건 라이브 화면에서부터
                달고 있던 안내다 */}
            <p className="px-edge text-caption text-text-4 pt-3">
              {LIVE_SEASON_LABEL} · {squad.size}명 · 이적 반영이 며칠 늦을 수
              있어요
            </p>
            <SquadGrid squad={squad} />
          </>
        ) : (
          <p className="text-body text-text-4 py-16 text-center">
            선수단을 불러오지 못했어요.
          </p>
        )
      ) : (
        <TeamFiguresList figures={figures} />
      )}
    </>
  );
}
