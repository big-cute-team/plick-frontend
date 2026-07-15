/**
 * @file 홈 화면 목데이터 — 피그마 W1 홈(node 203-2) 카피 그대로.
 *
 * 게시물 구성은 모바일 `_lib/mock.ts`와 같은 세트이며(같은 API를 소비할 예정),
 * 기자명 표기만 데스크톱 피그마 카피(한글)를 따른다.
 */
import type { FeedPost, User } from "./types";

/** 전체 피드 게시물 — 핫이슈·소식 리스트·실시간 인기가 공용으로 소비 */
export const POSTS: FeedPost[] = [
  {
    id: "h1",
    team: "LIV",
    stage: "RUMOUR",
    contentType: "GENERAL",
    title: "리버풀, 라이프치히 윙어 디오망드 영입 1차 제안",
    summary:
      "리버풀이 디오망드 영입을 위해 RB 라이프치히에 패키지를 제안한 것으로 전해졌다. 라이프치히는 핵심 자원의 이탈을 원치 않아 미온적이며, PSG도 관심을 보여 경쟁이 예상된다. 이적료는 약 6,000만 유로 선에서 논의되는 것으로 알려졌다.",
    tags: ["리버풀", "디오망드"],
    reporter: { name: "파브리시오 로마노", tier: 1 },
    timeLabel: "2분 전",
    views: 12400,
    commentCount: 318,
    likeCount: 320,
  },
  {
    id: "h2",
    team: "TOT",
    stage: "RUMOUR",
    contentType: "GENERAL",
    title: "토트넘, 세스코 영입 협상 재개…선수는 잔류에 무게",
    summary:
      "토트넘이 RB라이프치히 공격수 세스코 영입을 재추진한다. 다만 선수 본인은 현 소속팀 잔류 쪽에 무게를 두고 있다는 후문.",
    tags: ["토트넘", "세스코"],
    reporter: { name: "데이비드 온스타인", tier: 1 },
    timeLabel: "18분 전",
    views: 8100,
    commentCount: 27,
    likeCount: 180,
  },
  {
    id: "h3",
    team: "MCI",
    stage: "IN_PROGRESS",
    contentType: "GENERAL",
    title: "홀란드, 맨시티와 재계약 협상 돌입…주급 인상 유력",
    summary:
      "맨시티가 홀란드와 재계약 협상에 들어갔다. 주급 대폭 인상이 유력하며, 구단은 장기 계약으로 핵심 자원을 묶으려는 계획.",
    tags: ["맨시티", "홀란드"],
    reporter: { name: "사미 모크벨", tier: 2 },
    timeLabel: "34분 전",
    views: 6700,
    commentCount: 19,
    likeCount: 140,
  },
  {
    id: "n1",
    team: "ARS",
    stage: "RUMOUR",
    contentType: "GENERAL",
    title: "데클란 라이스, 부상에도 멕시코전 출전 예정",
    summary:
      "아스날 미드필더 데클란 라이스가 가벼운 부상에도 대표팀 멕시코전 출전을 강행할 예정이다.",
    tags: ["아스날", "라이스"],
    reporter: { name: "찰스 왓츠", tier: 2 },
    timeLabel: "41분 전",
    views: 5200,
    commentCount: 45,
    likeCount: 90,
  },
  {
    id: "n2",
    team: "MUN",
    stage: "RUMOUR",
    contentType: "GENERAL",
    title: "맨유, 여름 1순위는 수비형 미드필더…바이스 주목",
    summary:
      "맨유가 이번 여름 최우선 보강 포지션으로 수비형 미드필더를 점찍었다. 후보 중 바이스가 유력하게 거론된다.",
    tags: ["맨유", "바이스"],
    reporter: { name: "파브리시오 로마노", tier: 1 },
    timeLabel: "1시간 전",
    views: 4800,
    commentCount: 52,
    likeCount: 110,
  },
  {
    id: "n3",
    team: "CHE",
    stage: "RUMOUR",
    contentType: "GENERAL",
    title: "첼시, 오시멘 영입 재추진…나폴리와 협상 준비",
    summary:
      "첼시가 나폴리 공격수 오시멘 영입을 다시 추진한다. 구단은 협상 테이블을 준비 중인 것으로 알려졌다.",
    tags: ["첼시", "오시멘"],
    reporter: { name: "사이먼 존슨", tier: 2 },
    timeLabel: "1시간 전",
    views: 4100,
    commentCount: 38,
    likeCount: 76,
  },
  {
    id: "n4",
    team: "LIV",
    stage: "OFFICIAL",
    contentType: "DEBATE",
    title: '살라 "우승 전까지 이적 생각 없다"',
    summary:
      "모하메드 살라가 인터뷰에서 우승 도전이 끝나기 전까지 이적을 고려하지 않겠다고 밝혔다.",
    tags: ["리버풀", "살라"],
    reporter: { name: "폴 조이스", tier: 2 },
    timeLabel: "2시간 전",
    views: 9900,
    commentCount: 210,
    likeCount: 540,
  },
];

/** 홈 핫이슈 그리드용 상위 게시물 (히어로 1 + 서브 2) */
export const HOT_POSTS = POSTS.slice(0, 3);
/** 홈 "지금 올라온 소식" 리스트용 나머지 게시물 */
export const NEWS_POSTS = POSTS.slice(3);

/** 사이드바 "실시간 인기" — 조회수 상위 5개 */
export const TRENDING_POSTS = [...POSTS]
  .sort((a, b) => b.views - a.views)
  .slice(0, 5);

/** 로그인 유저 목데이터 — 마이팀 카드에서 사용 */
export const CURRENT_USER: User = {
  nickname: "김도완",
  handle: "@epl_fan_kim",
  email: "kim@plkr.app",
  myTeam: "LIV",
};

/** 알림 뱃지 목데이터 */
export const NOTIF_COUNT = 3;
