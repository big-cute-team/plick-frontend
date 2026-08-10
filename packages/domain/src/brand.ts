/**
 * @file 브랜드·검색 노출 문구의 단일 출처 (KAN-384) — web·mobile 공용.
 *
 * 같은 콘텐츠가 두 도메인(plick.co.kr, m.plick.co.kr)에 있으므로 title과
 * description도 두 앱이 같은 값을 내야 한다(구글 별도 모바일 URL 가이드).
 * 루트 메타데이터와 JSON-LD, 홈 소개 문구가 전부 여기서 가져다 쓴다.
 *
 * 구글은 description이 너무 짧거나 페이지 본문과 동떨어지면 무시하고 화면
 * 텍스트를 긁는다(KAN-384의 발단). 그래서 여기 문구는 핵심 검색어(프리미어리그,
 * EPL, 이적, 팀명)를 자연스럽게 포함한 문장으로 길게 쓴다.
 */

/**
 * 한글 브랜드명 — 검색 결과 상단 사이트명("쿠팡"처럼)에 쓰인다.
 * WebSite JSON-LD의 name과 og:site_name이 이 값이어야 구글이 채택한다.
 */
export const BRAND_NAME_KO = "플릭";

/** 영문 브랜드명 — 로고 표기이자 사이트명의 alternateName. */
export const BRAND_NAME_EN = "PLick";

/** 루트 기본 title — 브랜드 검색("플릭", "plick")의 파란 제목 줄. */
export const BRAND_TITLE = "플릭 PLick / 프리미어리그 소식을 릴스로";

/** 하위 페이지 title 템플릿 — "릴스 | 플릭 PLick"처럼 감싼다. */
export const BRAND_TITLE_TEMPLATE = "%s | 플릭 PLick";

/**
 * 루트·홈 공용 description. 구글 권장 길이(80~160자) 안에서 서비스 정의와
 * 팀 검색어를 함께 싣는다.
 */
export const BRAND_DESCRIPTION =
  "플릭(PLick)은 프리미어리그 이적 루머와 오피셜 이적 소식을 릴스처럼 넘겨보는 축구 뉴스 서비스입니다. 리버풀, 토트넘, 아스날, 맨유, 첼시, 맨시티 등 EPL 팀별 이적설과 핫이슈, 팬 반응까지 한곳에서 확인하세요.";

/**
 * 정적 페이지별 description — 두 앱이 같은 값을 낸다.
 * 페이지 고유 문구가 없으면 구글이 본문을 긁어 스니펫이 깨진다(KAN-384).
 */
export const PAGE_DESCRIPTIONS = {
  reels:
    "프리미어리그 이적 루머와 이적 소식을 짧은 릴스로 넘겨보세요. 리버풀부터 맨시티까지 EPL 이적시장 소식을 위로 스와이프하며 빠르게 확인할 수 있습니다.",
  articles:
    "프리미어리그 이적 기사 모아보기. 리버풀, 토트넘, 아스날, 맨유, 첼시, 맨시티 등 팀별 이적 루머와 오피셜 소식을 최신순으로 확인하세요.",
  login:
    "플릭에 로그인하세요. 카카오·구글 계정으로 간편하게 로그인하고 응원하는 프리미어리그 팀의 이적 소식을 받아볼 수 있습니다.",
  signup:
    "플릭에 가입하세요. 카카오·구글 계정으로 간편하게 가입하고 응원 팀을 등록하면 프리미어리그 이적 루머와 소식을 맞춤으로 볼 수 있습니다.",
  faq: "플릭(PLick) 이용 중 자주 묻는 질문과 답변을 모았습니다. 계정, 응원팀 설정, 릴스 이용 방법을 확인하세요.",
  terms: "플릭(PLick) 서비스 이용약관입니다.",
  privacy: "플릭(PLick) 개인정보처리방침입니다.",
} as const;

/**
 * 홈·팀 허브 하단의 크롤러블 소개 문구 (KAN-384).
 *
 * 홈 본문에 서비스가 뭔지 설명하는 텍스트가 한 줄도 없어서 구글이 탭바와 빈
 * 상태 문구를 긁어 스니펫을 만들었다. description과 본문이 겹쳐야 구글이
 * description을 채택하므로 화면에 보이는 텍스트로 싣는다.
 *
 * @param teamFullName 팀 허브면 팀 정식 명칭, 홈이면 생략
 */
export function homeIntroCopy(teamFullName?: string): string {
  if (teamFullName) {
    return `${teamFullName}의 이적 루머와 오피셜 소식을 모은 페이지예요. 플릭(PLick)에서 프리미어리그 이적시장 소식을 릴스처럼 빠르게 확인해 보세요.`;
  }
  return "플릭(PLick)은 프리미어리그 이적 루머와 오피셜 이적 소식을 릴스처럼 넘겨보는 축구 뉴스 서비스예요. 리버풀, 토트넘, 아스날, 맨유, 첼시, 맨시티까지 EPL 팀별 이적설과 핫이슈, 팬 반응을 한곳에서 확인해 보세요.";
}
