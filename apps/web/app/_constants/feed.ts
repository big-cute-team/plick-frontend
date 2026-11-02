/**
 * @file 커서 피드(기사·릴스)의 클라 캐시 정책 상수. 값은 `@plick/core/query-policy`가 단일 출처다
 * (KAN-685에서 두 앱의 같은 값을 올렸다). 여기서 다시 내보내 앱 call site는 그대로 두고, 이 앱만 다른
 * 값이 필요해지면 이 파일에서 자기 값을 선언한다.
 */

export { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@plick/core/query-policy";
