/**
 * @file 측정·분석 설정. GA4 측정 ID(KAN-380)와 BE 분석 헤더의 앱 구분값(KAN-542).
 *
 * `NEXT_PUBLIC_` env는 빌드 시점에 번들로 굳는다(ADR 0070). 배포 값은 deploy.yml
 * 빌드 스텝에 있고, main 브랜치 빌드에만 넣는다 — dev 배포와 로컬은 값이 비어
 * 태그가 아예 렌더되지 않으므로 개발 트래픽이 실서비스 지표에 섞이지 않는다.
 */

import type { PlickClient } from "@plick/core/analytics";

/**
 * GA4 측정 ID(`G-XXXXXXXXXX`). 값이 없으면 측정을 붙이지 않는다.
 *
 * 브라우저에 그대로 노출되는 공개 값이라 시크릿으로 감추지 않는다 — 측정 ID는
 * 데이터를 읽을 권한이 아니라 어디로 보낼지를 가리키는 주소다.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/**
 * BE 분석 헤더 `X-Plick-Client`에 싣는 이 앱의 고정값 (KAN-542). 메인 API는 브라우저가 아니라
 * 프런트 서버를 거쳐 호출되므로 요청 도메인으로는 앱을 못 가른다 - 프록시가 이 값을 헤더로 보낸다.
 * 값 목록은 `@plick/core/analytics`의 `PlickClient`.
 */
export const PLICK_CLIENT: PlickClient = "mobile_web";
