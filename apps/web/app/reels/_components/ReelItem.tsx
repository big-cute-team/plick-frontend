"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime, isDebateClosed } from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { ShareDialog } from "@/_components/ShareDialog";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { useReelLike } from "@/_hooks/useReelLike";
import { reelSharePath } from "@/_utils/share";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 릴 한 장 — 9:16 카드(미디어 + 팀, 제목, 기자) + 액션 레일.
 *
 * 카드는 흰 상자(`bg-bg`, `shadow-card`, 각진)이고 뷰어 높이를 늘 꽉 채운다. 헤더
 * 바로 밑부터 창 바닥까지이고 폭은 9:16 비율이 정한다 (KAN-574). 전에는 시안의
 * 396x704 어두운 상자에 위아래 여백을 둬서 큰 창에서 카드가 가운데 작게 떴고, 흰
 * 트윗 카드가 어두운 상자 안에 따로 떠 있었다. 이제 상자 자체가 흰 면이라 임베드가
 * 배경을 채운 것처럼 보이고, 글자는 그라데이션 스크림 없이 본문색으로 쓴다.
 *
 * 레일 배치는 뷰포트에 따라 다르다.
 * - 데스크톱(lg↑): 카드 밖 오른쪽에 flex 형제로 나란히. 이전, 다음 화살표가 붙는다.
 * - 좁은 폭: 카드 안 우측 하단에 오버레이하고, 카드는 `max-w-full`로 가용 폭을 꽉 채운다.
 *
 * 사진(`imageUrl`)이 있으면 임베드 영역을 덮고, 없으면(현재 발행 릴 전건이 그렇다)
 * 원문 트윗 임베드가 그 자리를 대신한다. 사진도 제목 윗선에서 끝나 글자와 겹치지 않는다.
 *
 * 임베드 영역은 카드 맨 위부터 제목(헤드라인) 윗선까지다. 카드가 그 영역보다
 * 작으면 세로 가운데에 서고(`justify-content: safe center`), 크면 위에 붙고 자기
 * 높이만큼 그대로 서서 제목 뒤로 겹친다. 자르지 않는다(X Display Requirements가
 * 본문 수정, 말줄임을 금지한다). 아래선은 제목 윗선을 재서 잡으므로 제목이 1~3줄로
 * 자라면 영역이 그만큼 줄어든다. 세부 패널이 열려 카드 폭이 줄 때도 ResizeObserver가
 * 다시 잰다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 엠블럼을
 * 뺀다. 기자도 없을 수 있어 그때는 발행 시각만 남는다. 루머 단계와 기자 등급,
 * "토론 중" 칩은 시안 규칙대로 지웠다. 투표가 붙은 릴은 빨간 VS 글자만 단다 (KAN-567).
 *
 * 좋아요는 여기서 들고 있다 (KAN-330). 레일이 데스크톱, 좁은 폭으로 두 벌 붙으므로
 * 훅과 비로그인 팝업을 이 층에 한 번만 두고 두 레일이 같은 상태를 그린다.
 * 공유 팝업(KAN-349)도 같은 이유로 이 층에 있다. 릴 딥링크(`/reels/[postId]`)
 * 주소를 보여 주고 복사시킨다.
 *
 * @param reel - 표시할 릴
 * @param onOpenDetail - 카드 어디든(버튼, 링크 제외), 댓글 버튼 클릭 시 세부 패널을 여는 콜백(KAN-219, KAN-525)
 * @param onPrev - 이전 릴로 (첫 릴이면 undefined)
 * @param onNext - 다음 릴로 (마지막 릴이면 undefined)
 * @param eager - 첫 릴(LCP 후보)이면 사진을 lazy 큐잉 없이 최우선으로 받는다 (KAN-421)
 */
export function ReelItem({
  reel,
  onOpenDetail,
  onPrev,
  onNext,
  eager = false,
}: {
  reel: ReelCard;
  onOpenDetail: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  eager?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLButtonElement>(null);
  const team = reel.teams[0] ? TEAMS[reel.teams[0]] : null;
  const like = useReelLike(reel);
  const [shareOpen, setShareOpen] = useState(false);
  /* 열린 토론이 붙은 릴만 VS를 단다 (KAN-418). 마감(FINISH) 릴도 debate가 인라인으로
     오므로(KAN-420) contentType으로 거르고, closesAt이 지난 토론도 마감이라 함께 거른다(KAN-436) */
  const hasVote =
    reel.debate !== null &&
    reel.contentType !== "FINISH" &&
    !isDebateClosed(reel.debate.closesAt);

  /** 임베드 영역의 아래선(제목 윗선까지)까지의 거리(px, 카드 바닥 기준) */
  const [embedBottom, setEmbedBottom] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    const title = titleRef.current;
    if (!card || !title) return;
    const measure = () =>
      setEmbedBottom(
        card.getBoundingClientRect().bottom - title.getBoundingClientRect().top,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(title);
    return () => observer.disconnect();
  }, []);

  /**
   * 카드 어디를 눌러도 세부 패널을 연다 (KAN-525, 모바일과 같다). 제 기능이 있는
   * 요소(좋아요, 공유 버튼, 트윗 임베드 안의 링크)는 `closest`로 걸러 그대로 두고,
   * 포털로 뜨는 공유, 로그인 팝업은 React 트리로는 이 컴포넌트 자식이라 클릭이
   * 여기까지 버블링되므로 DOM 포함 여부로 한 번 더 거른다. 팝업 배경을 눌러 닫는
   * 클릭이 패널을 열면 안 된다. 뷰어는 드래그가 아니라 스크롤 스냅이라 스와이프 뒤
   * click 문제는 없다.
   *
   * @param e - 카드 click 이벤트
   */
  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target)) return;
    if (target.closest("a, button, input, textarea")) return;
    onOpenDetail();
  };

  return (
    <div className="flex h-full w-full items-end justify-center gap-4 lg:gap-6">
      <div
        ref={cardRef}
        onClick={handleCardClick}
        className="bg-bg shadow-card relative aspect-[9/16] h-full w-auto max-w-full min-w-0 cursor-pointer overflow-hidden"
      >
        {/* 사진이 있으면 임베드 영역을 덮는다. 없으면 원문 트윗 임베드가 자리를
            대신하고, 로드 전에는 흰 면이 그대로 남는다 */}
        {reel.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 릴 배경 이미지 호스트가 유동이라 next/image 대신 일반 img (MediaThumb과 같은 이유)
          <img
            src={reel.imageUrl}
            alt=""
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            className="absolute inset-x-0 top-0 w-full object-cover"
            style={{ height: `calc(100% - ${embedBottom}px)` }}
          />
        ) : (
          reel.sourceUrl && (
            <div
              className="reel-embed absolute inset-x-0 top-0 flex flex-col [justify-content:safe_center] px-4"
              style={{ bottom: embedBottom }}
            >
              <TweetEmbed url={reel.sourceUrl} />
            </div>
          )
        )}

        {/* 하단 정보 블록 — 팀, 제목, 기자. 흰 면 위 본문색이라 스크림이 없다 (KAN-574).
            좁은 폭에선 우측에 레일이 겹치므로 pr-16으로 자리를 비운다. */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col pt-4 pr-16 pb-6.5 pl-5.5 lg:pr-5.5">
          {(team || hasVote) && (
            <div className="flex items-center gap-2 pb-2.75">
              {team && (
                <>
                  <TeamCrest team={team} size={18} />
                  <span className="text-caption-lg text-text-strong font-bold">
                    {team.name}
                  </span>
                </>
              )}
              {hasVote && <VsMark size="md" />}
            </div>
          )}
          <button
            ref={titleRef}
            type="button"
            onClick={onOpenDetail}
            className="focus-visible:outline-accent w-fit pb-2.75 text-left hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {/* 파싱이 어긋나 원문 트윗이 통째로 제목에 들어온 기사가 있어 줄수를 묶는다 */}
            <span className="text-section text-text-strong tracking-title line-clamp-3 leading-[1.36] font-black">
              {reel.title}
            </span>
          </button>
          <p className="text-label-lg text-text-3">
            {reel.reporter && (
              <>
                <span className="text-text-strong font-bold">
                  {reel.reporter.name}
                </span>
                {", "}
              </>
            )}
            <span suppressHydrationWarning>
              {formatRelativeTime(reel.publishedAt)}
            </span>
          </p>
        </div>

        {/* 좁은 폭 전용: 레일을 카드 안 우측 하단에 오버레이 */}
        <ReelActionRail
          reel={reel}
          onLike={like.toggle}
          onOpenComments={onOpenDetail}
          onShare={() => setShareOpen(true)}
          className="absolute right-3 bottom-4 lg:hidden"
        />
      </div>

      {/* 데스크톱 전용: 카드 밖 오른쪽 레일 */}
      <ReelActionRail
        reel={reel}
        navigable
        onLike={like.toggle}
        onOpenComments={onOpenDetail}
        onShare={() => setShareOpen(true)}
        onPrev={onPrev}
        onNext={onNext}
        className="max-lg:hidden"
      />

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
    </div>
  );
}
