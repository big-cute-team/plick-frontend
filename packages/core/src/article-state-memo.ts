/**
 * @file 내가 누른 기사 상태를 브라우저에 적어 두는 기억 (KAN-664).
 *
 * 내 상태는 페이지가 뜬 뒤 BE에 묻기 때문에 응답이 오기 전 잠깐은 하트가 비어 있다. 내가 누른
 * 기사만 `localStorage`에 남겨 두면 다시 들어왔을 때 그 사이를 이 값으로 먼저 채울 수 있다.
 * 응답이 오면 그 값이 이기고, 기억도 응답에 맞춰 고친다(다른 기기에서 취소한 경우).
 *
 * 눌린 것(좋아요 했거나 투표한 것)만 적고 안 누른 기사는 지운다. 기본값이 "안 누름"이라
 * 적을 필요가 없다. 상한을 넘으면 오래 적은 것부터 버린다. 세션이 바뀌면(로그인·로그아웃)
 * 남의 기록이 되므로 통째로 지운다.
 *
 * 사파리 사생활 모드처럼 저장소가 막힌 환경에서는 조용히 아무것도 안 한다. 기억은 화면을
 * 조금 앞당기는 보조라 없어도 동작이 맞다.
 */

import type { ArticleState } from "@plick/domain/types";

const MEMO_KEY = "plick:myArticleStates:v1";
const MEMO_OWNER_KEY = "plick:myArticleStates:owner";
const MEMO_LIMIT = 300;

type Memo = Record<string, ArticleState>;

function readAll(): Memo {
  try {
    const raw = window.localStorage.getItem(MEMO_KEY);
    return raw ? (JSON.parse(raw) as Memo) : {};
  } catch {
    return {};
  }
}

function writeAll(memo: Memo): void {
  try {
    window.localStorage.setItem(MEMO_KEY, JSON.stringify(memo));
  } catch {
    /* 저장소가 막혔거나 가득 찼다. 기억은 보조라 넘어간다 */
  }
}

/**
 * 적어 둔 상태를 읽는다.
 *
 * @param articleId 기사 id
 * @returns 눌렀던 기사면 그 상태, 아니면 undefined
 */
export function readArticleStateMemo(
  articleId: string,
): ArticleState | undefined {
  if (typeof window === "undefined") return undefined;
  return readAll()[articleId];
}

/**
 * 상태를 적는다. 눌린 게 하나도 없으면 지운다.
 *
 * @param articleId 기사 id
 * @param patch 바뀐 필드. 적어 둔 값(없으면 기본값)에 덮는다
 */
export function writeArticleStateMemo(
  articleId: string,
  patch: Partial<ArticleState>,
): void {
  if (typeof window === "undefined") return;
  const memo = readAll();
  const next = {
    liked: false,
    vote: null,
    ...memo[articleId],
    ...patch,
  } satisfies ArticleState;

  /* 다시 적는 항목은 맨 뒤로 보내 "오래된 것부터 버리기"의 순서를 맞춘다 */
  delete memo[articleId];
  if (next.liked || next.vote !== null) memo[articleId] = next;

  const ids = Object.keys(memo);
  for (const id of ids.slice(0, Math.max(0, ids.length - MEMO_LIMIT))) {
    delete memo[id];
  }
  writeAll(memo);
}

/**
 * 기억의 주인을 맞춘다. 적어 둔 세션 종류와 지금 세션이 다르면 기억을 지운다.
 *
 * 브라우저는 토큰을 못 읽어 "누구의 세션인가"를 모른다. 대신 표식 쿠키(게스트/소셜)가 바뀌는
 * 순간을 세션이 바뀐 순간으로 본다. 소셜 로그인은 OAuth 왕복으로 문서를 새로 받아서 메모리에
 * 남은 이전 값이 없으므로, 이전 종류를 저장소에 함께 적어 두고 비교한다. 로그아웃은 게스트로
 * 돌아가므로 소셜 계정끼리 바로 바뀌는 경우도 중간에 한 번 걸린다.
 *
 * @param kind 지금 세션 종류. 세션이 없으면 null
 * @returns 주인이 바뀌어 기억을 지웠으면 true
 */
export function syncArticleStateMemoOwner(kind: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    const owner = window.localStorage.getItem(MEMO_OWNER_KEY);
    if (owner === (kind ?? "")) return false;
    window.localStorage.removeItem(MEMO_KEY);
    window.localStorage.setItem(MEMO_OWNER_KEY, kind ?? "");
    return owner !== null;
  } catch {
    return false;
  }
}
