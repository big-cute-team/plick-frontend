import type { Comment, FeedPost, Team, TeamCode, User } from "./types";

export const TEAMS: Record<TeamCode, Team> = {
  LIV: { code: "LIV", name: "리버풀", colorVar: "--plk-team-liv" },
  TOT: { code: "TOT", name: "토트넘", colorVar: "--plk-team-tot" },
  ARS: { code: "ARS", name: "아스날", colorVar: "--plk-team-ars" },
  MUN: { code: "MUN", name: "맨유", colorVar: "--plk-team-mun" },
  CHE: { code: "CHE", name: "첼시", colorVar: "--plk-team-che" },
  MCI: { code: "MCI", name: "맨시티", colorVar: "--plk-team-mci" },
};

/** 팀 필터 순서 (전체 + 빅6) */
export const TEAM_ORDER: TeamCode[] = [
  "LIV",
  "TOT",
  "ARS",
  "MUN",
  "CHE",
  "MCI",
];

const SAMPLE_COMMENTS: Comment[] = [
  {
    id: "c1",
    author: "@kop_united",
    body: "디오망드 진짜 오면 윙어 뎁스 확 살아난다. 로마노가 여기서 틀린 적이 없어서 기대됨.",
    timeLabel: "12분 전",
    likeCount: 34,
  },
  {
    id: "c2",
    author: "@anfield_98",
    body: "1차 제안이면 아직 멀었지… 라이프치히가 쉽게 안 놔줄 듯.",
    timeLabel: "20분 전",
    likeCount: 12,
    replies: [
      {
        id: "c2r1",
        author: "@ynwa_kim",
        body: "그래도 셀링 클럽이라 금액만 맞으면 협상 빨라짐",
        timeLabel: "15분 전",
        likeCount: 5,
      },
    ],
  },
  {
    id: "c3",
    author: "@transfer_holic",
    body: "조회수 벌써 12K네 ㅋㅋ 다들 관심 많다",
    timeLabel: "24분 전",
    likeCount: 3,
  },
];

export const POSTS: FeedPost[] = [
  {
    id: "h1",
    team: "LIV",
    stage: "RUMOUR",
    contentType: "GENERAL",
    title: "리버풀, 라이프치히 윙어 디오망드 영입 1차 제안",
    summary:
      "리버풀이 라이프치히 측에 윙어 디오망드에 대한 1차 오퍼를 전달했다. 개인 조건은 큰 문제가 없으나 이적료 격차가 남아 있는 상황.",
    reporter: { name: "Fabrizio Romano", tier: 1 },
    timeLabel: "2분 전",
    views: 12400,
    commentCount: 45,
    likeCount: 320,
    comments: SAMPLE_COMMENTS,
  },
  {
    id: "h2",
    team: "TOT",
    stage: "RUMOUR",
    contentType: "GENERAL",
    title: "토트넘, 세스코 영입 협상 재개…선수는 잔류에 무게",
    summary:
      "토트넘이 RB라이프치히 공격수 세스코 영입을 재추진한다. 다만 선수 본인은 현 소속팀 잔류 쪽에 무게를 두고 있다는 후문.",
    reporter: { name: "David Ornstein", tier: 1 },
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
    reporter: { name: "Sami Mokbel", tier: 2 },
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
    reporter: { name: "Charles Watts", tier: 2 },
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
    reporter: { name: "Fabrizio Romano", tier: 1 },
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
    reporter: { name: "Simon Johnson", tier: 2 },
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
    reporter: { name: "Paul Joyce", tier: 2 },
    timeLabel: "2시간 전",
    views: 9900,
    commentCount: 210,
    likeCount: 540,
    debate: {
      topic: "살라, 리버풀에 남을까?",
      optionA: "잔류한다",
      optionB: "떠난다",
      votesA: 1820,
      votesB: 640,
      closesLabel: "3일 후 마감",
      myVote: null,
    },
  },
];

/** 핫이슈(캐러셀) / 지금 올라온 소식(리스트) 구분 */
export const HOT_POSTS = POSTS.slice(0, 3);
export const NEWS_POSTS = POSTS.slice(3);

export const CURRENT_USER: User = {
  nickname: "김도완",
  handle: "@kim",
  email: "kim@plkr.app",
  myTeam: "LIV",
};

export function getPost(id: string): FeedPost | undefined {
  return POSTS.find((p) => p.id === id);
}
