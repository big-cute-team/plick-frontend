/**
 * @file TanStack Query 메타 타입 보강 (KAN-447).
 *
 * Register 병합은 이 파일이 컴파일에 포함되는 것만으로 프로젝트 전역에 적용된다.
 */

import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /**
       * 콜사이트가 에러 UI를 완결 처리하는 뮤테이션 표식 — 전역 안전망
       * (QueryProvider의 MutationCache onError)이 토스트를 띄우지 않는다.
       */
      errorHandled?: boolean;
    };
  }
}
