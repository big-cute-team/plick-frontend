"use client";

import { memo, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime, teamProfilePath } from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import type { Tweet } from "react-tweet/api";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { SHEET_DRAG_Y_VAR, SHEET_TRANSITION } from "@/_constants/reels";
import { useArticleView } from "@/_hooks/useArticleView";
import { useReelLike } from "@/_hooks/useReelLike";
import type { TitleMotion } from "@/_types/reels";
import { titleLiftDistance } from "@/_utils/reels";
import { reelSharePath } from "@/_utils/share";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 탭해야 뜨는 시트는 초기 번들에서 뺀다 (KAN-428). 조건부 마운트라 서버
 * HTML에 없고, 첫 탭 때 청크를 받아 뜬다. TweetEmbed는 dynamic 금지 — 첫 릴이
 * 서버 렌더(KAN-422)라 ssr을 끄면 초기 HTML의 임베드가 사라진다.
 */
const LoginPromptDialog = dynamic(
  () =>
    import("@/_components/LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);
const ShareDialog = dynamic(
  () => import("@/_components/ShareDialog").then((m) => m.ShareDialog),
  { ssr: false },
);

/**
 * 릴 한 장 (시안 KAN-567 "릴스", 라이트). 흰 바탕에 radius 22 미디어 상자, 그 밑에
 * 팀(엠블럼 22 + 이름 + VS), 제목(19/900, 2줄 clamp), 기자와 시각의 정보 블록과
 * 오른쪽 세로 액션 레일이 선다. 상자 안은 사진(imageUrl)이면 사진이 가득 덮고,
 * 없으면 원문 트윗 임베드를 흰 카드(radius 16, padding 16)에 담아 세로 가운데에 둔다.
 *
 * 전 디자인(KAN-296, KAN-299)의 풀스크린 미디어와 고정 다크 스크림, 흰 글자,
 * 루머 단계 배지(PostBadges), 기자 등급(ReporterTierBadge), "토론 중" 칩
 * (DebateLiveChip)은 시안 규칙대로 전부 뺐다. 투표 이슈는 빨간 VS 글자로만 알린다.
 *
 * 임베드 카드 안의 트윗 바탕은 흰색이어야 해서 `.reel-embed` 규칙이 읽는
 * `--plk-reel-bg`를 카드에서 `--plk-bg`로 덮는다 — 규칙 자체(글자·아바타 축소)는
 * 그대로 물려받는다. 카드가 상자보다 크면 상자가 아래를 잘라 낸다.
 *
 * Embla 캐러셀의 슬라이드 하나다(`shrink-0 basis-full`).
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀 줄을
 * 뺀다. 기자도 없을 수 있다 (KAN-276).
 *
 * 좋아요 상태는 여기서 들고 있다 (KAN-308). 비로그인 시트가 레일이 아니라 이 층에
 * 붙는 이유는 {@link ReelActionRail} 주석에 있다. 공유 시트(KAN-312)도 같은 자리에 둔다.
 *
 * 활성 슬라이드가 되면 조회로 기록한다 (KAN-310, {@link useArticleView}). 피드 안
 * 순위(`rank`)를 같이 실어 서버가 `feed_rank`로 남긴다 (KAN-543).
 *
 * memo로 감싼다 (KAN-430) — 피드가 렌더될 때(개폐·activeIndex 변화) props가 그대로인
 * 릴은 건너뛴다. 시트가 붙은 릴만 titleMotion 객체가 갈리고 나머지는 null로 안정된다.
 *
 * @param rank - 피드 안 순위(0부터). 조회 기록에 실린다
 * @param active - 지금 보고 있는 릴인가. 아니면 `inert`로 묶어 화면 밖 릴의 버튼이
 *   탭 포커스를 받거나 스크린리더에 읽히지 않게 한다.
 * @param onOpenDetail - 릴 화면 어디든(버튼·링크 제외) 또는 댓글 아이콘 탭 시 호출. 어느 릴인지와
 *   정보 블록이 도킹 지점까지 이동할 거리(px, 음수)를 넘긴다 — 거리는 탭 시점에 측정한다.
 *   (릴을 인자로 받는 공유 콜백이라 정체성이 고정돼 memo가 산다)
 * @param titleMotion - 이 릴의 시트가 떠 있는 동안의 정보 블록 이동 상태 (아니면 null)
 * @param seedTweet - 서버가 미리 받아 둔 이 릴의 트윗 데이터 (KAN-422, 첫 릴만).
 *   임베드가 SSR로 그려져 클라 fetch를 건너뛴다.
 * @param nearActive - 보고 있는 릴에서 {@link REELS_EMBED_FETCH_AHEAD} 안인가.
 *   밖이면 트윗 임베드 fetch를 미룬다 (KAN-429). 한 번 안으로 들어온 릴은 창 안에
 *   있는 한 계속 그린다 — 받은 임베드를 비웠다 다시 그리면 뒤로 넘길 때 깜빡인다.
 * @param inWindow - 보고 있는 릴에서 DOM 유지 창({@link REELS_DOM_WINDOW}) 안인가
 *   (KAN-431). 밖이면 내용 없이 빈 섹션 골격만 그린다 — Embla가 슬라이드 수와
 *   높이를 재는 구조라 섹션 자체는 남긴다. 컴포넌트는 마운트를 유지하므로 fetch
 *   래치 같은 상태는 보존되고, 창에 다시 들어오면 swr 캐시로 즉시 되그린다.
 */
export const ReelItem = memo(function ReelItem({
  reel,
  rank,
  active,
  onOpenDetail,
  titleMotion,
  seedTweet,
  nearActive = true,
  inWindow = true,
}: {
  reel: ReelCard;
  rank: number;
  active: boolean;
  onOpenDetail: (reel: ReelCard, lift: number) => void;
  titleMotion: TitleMotion | null;
  seedTweet?: Tweet;
  nearActive?: boolean;
  inWindow?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const team = reel.teams[0] ? TEAMS[reel.teams[0]] : null;
  const like = useReelLike(reel);
  const [shareOpen, setShareOpen] = useState(false);

  /* fetch 게이트는 한 방향으로만 잠긴다 (KAN-429) — 근처였던 적이 있으면 계속
     fetch 허용. 렌더 중 setState는 React가 지원하는 상태 보정 패턴이다 */
  const [embedFetchStarted, setEmbedFetchStarted] = useState(nearActive);
  if (nearActive && !embedFetchStarted) setEmbedFetchStarted(true);

  /* 활성 슬라이드가 되는 즉시 조회로 기록한다 (KAN-310). 릴스 전용 엔드포인트가
     없어 기사와 같은 걸 쓴다 — 릴과 기사가 같은 articleSummaryId 체계다. 피드 안
     순위를 같이 실어 서버가 `feed_rank`로 남긴다 (KAN-543) */
  useArticleView(reel.id, active, rank);

  const handleOpen = () => {
    const section = sectionRef.current;
    const info = infoRef.current;
    if (!section || !info) return;
    onOpenDetail(
      reel,
      titleLiftDistance(
        section.getBoundingClientRect(),
        info.getBoundingClientRect(),
      ),
    );
  };

  /**
   * 릴 화면 어디를 눌러도 세부 시트를 연다 (KAN-525). 전에는 제목·기자 줄·댓글
   * 아이콘만 탭 타깃이라 사진이나 빈 배경을 눌러도 아무 일이 없었다.
   *
   * 제 기능이 있는 요소는 건드리지 않는다. 좋아요·공유 버튼, 팀 링크, 트윗 임베드
   * 안의 링크는 `closest`로 걸러 그대로 둔다(버튼은 이미 각자 시트를 연다).
   * 공유·로그인 시트는 포털이라 DOM은 섹션 밖인데 React 이벤트는 트리를
   * 따라 여기까지 올라오므로, DOM 포함 여부로 한 번 더 거른다 — 시트 딤을 눌러
   * 닫는 탭이 세부 시트를 열면 안 된다.
   *
   * 세로 스와이프 뒤의 click은 Embla가 캡처 단계에서 삼키므로(dragThreshold를
   * 넘긴 제스처) 넘기다 손을 떼도 시트가 열리지 않는다. 시트가 떠 있는 동안은
   * 시트 층(z-20)이 섹션을 덮어 여기까지 오지 않지만 보험으로 한 번 더 막는다.
   *
   * @param e - 섹션 click 이벤트
   */
  const handleSurfaceClick = (e: MouseEvent<HTMLElement>) => {
    if (titleMotion) return;
    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target)) return;
    if (target.closest("a, button, input, textarea")) return;
    handleOpen();
  };

  /**
   * 정보 블록의 transform. 드래그 오프셋은 {@link SHEET_DRAG_Y_VAR}
   * CSS 변수로 흐르므로(KAN-430) 손가락을 따라가는 동안 이 컴포넌트는 렌더되지
   * 않는다. 클램프(도킹 지점 위~원래 자리 0 사이)도 CSS `min()`이 대신한다 —
   * 시트를 원래 자리 밑까지 내려도 블록은 제 위치 아래로 내려가지 않는다.
   */
  const infoTransform = titleMotion?.shown
    ? `translateY(min(0px, calc(${titleMotion.lift}px + var(${SHEET_DRAG_Y_VAR}, 0px))))`
    : "translateY(0px)";

  /* DOM 유지 창 밖 — 빈 골격만. 훅은 위에서 전부 돌았으므로 조건부 훅 규칙 위반이
     아니고, 상태(fetch 래치·좋아요 시트 등)도 마운트와 함께 살아 있다 (KAN-431) */
  if (!inWindow) {
    return (
      <section
        ref={sectionRef}
        inert
        className="bg-bg relative h-full w-full shrink-0 basis-full overflow-hidden"
      />
    );
  }

  return (
    <section
      ref={sectionRef}
      inert={!active}
      onClick={handleSurfaceClick}
      className="bg-bg px-edge relative flex h-full w-full shrink-0 basis-full flex-col gap-3.5 overflow-hidden pt-1.5 pb-4"
    >
      {/* 미디어 상자 — 사진이 있으면 가득 덮고, 없으면 원문 트윗 임베드를 흰 카드에
          담는다. 로드 전에는 상자 바탕(bg-reel-bg)이 그대로 남고 실패가 확정되면
          카드 안에 안내 문구가 선다 (KAN-296) */}
      <div className="bg-reel-bg rounded-hero relative min-h-0 flex-1 overflow-hidden">
        {reel.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 릴 이미지 호스트가 유동이라 next/image 대신 일반 img (핫이슈와 같은 이유)
          <img
            src={reel.imageUrl}
            alt=""
            /* 보고 있는 릴(첫 진입 시 index 0)은 LCP 후보라 lazy 큐잉 대신 최우선으로
               내려받는다 (KAN-421) */
            loading={active ? "eager" : "lazy"}
            fetchPriority={active ? "high" : "auto"}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          reel.sourceUrl && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-4">
              <div
                className="reel-embed bg-bg rounded-card max-h-full w-full overflow-hidden p-4"
                style={
                  {
                    "--plk-reel-bg": "var(--plk-bg)",
                  } as React.CSSProperties
                }
              >
                <TweetEmbed
                  url={reel.sourceUrl}
                  seedTweet={seedTweet}
                  defer={!embedFetchStarted}
                />
              </div>
            </div>
          )
        )}
      </div>

      {/* 정보 블록 + 오른쪽 액션 레일 */}
      <div className="flex shrink-0 items-end gap-3.5">
        {/* 팀·제목·기자 — 시트가 열리면 이 블록이 시트 라인 위까지 올라간다.
            z-30: 시트 오버레이(z-20)보다 위에 그려지고, 흰 바탕(bg-bg)이라 미디어
            상자 위로 올라가도 글자가 읽힌다 */}
        <div
          /* 측정용 infoRef에 더해, 시트가 떠 있으면 드래그 변수 수신자로도 등록 (KAN-430) */
          ref={(node) => {
            infoRef.current = node;
            return titleMotion?.dragTargetRef(node);
          }}
          className="bg-bg relative z-30 min-w-0 flex-1"
          style={{
            transform: infoTransform,
            transition: titleMotion?.dragging ? "none" : SHEET_TRANSITION,
            /* 드래그 중 프레임마다 다시 칠하지 않게 제스처 동안만 컴포지터 승격
               (KAN-430, 상시 부착 금지) */
            willChange: titleMotion?.dragging ? "transform" : undefined,
          }}
        >
          {(team || reel.debate) && (
            <div className="flex items-center gap-1.75 pb-2">
              {team && (
                <Link
                  href={teamProfilePath(team.code)}
                  className="flex items-center gap-1.75 active:opacity-60"
                >
                  <TeamCrest team={team} size={22} />
                  <span className="text-label-lg text-text-strong font-bold">
                    {team.name}
                  </span>
                </Link>
              )}
              {reel.debate && <VsMark size="md" />}
            </div>
          )}
          <button
            type="button"
            onClick={handleOpen}
            className="block w-full text-left"
            style={{ pointerEvents: titleMotion ? "none" : "auto" }}
          >
            {/* 파싱이 어긋나 원문 트윗이 통째로 제목에 들어온 기사가 있어 줄수를 묶는다 */}
            <span className="text-reel tracking-title text-text-strong line-clamp-2 leading-[1.38] font-black text-pretty">
              {reel.title}
            </span>
          </button>
          <div className="flex items-baseline gap-1.75 pt-2">
            {reel.reporter && (
              <span className="text-label-lg text-text-2 font-bold">
                {reel.reporter.name}
              </span>
            )}
            <span className="text-label text-text-4" suppressHydrationWarning>
              {formatRelativeTime(reel.publishedAt)}
            </span>
          </div>
        </div>

        <ReelActionRail
          reel={reel}
          onLike={like.toggle}
          onComment={handleOpen}
          onShare={() => setShareOpen(true)}
        />
      </div>

      {like.needsLogin && (
        <LoginPromptDialog
          onClose={like.dismissLogin}
          description={LIKE_LOGIN_PROMPT}
        />
      )}

      {/* 릴은 릴 딥링크로 공유한다 (KAN-349) — 받은 사람이 같은 릴에서 이어 본다 */}
      {shareOpen && (
        <ShareDialog
          path={reelSharePath(reel.id)}
          articleId={reel.id}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
});
