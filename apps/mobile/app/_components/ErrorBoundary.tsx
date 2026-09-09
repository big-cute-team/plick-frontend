"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { reportClientError } from "@plick/core/client-error";

interface ErrorBoundaryProps {
  /**
   * 메트릭 라벨로 나갈 경계 이름 (KAN-457). 어느 화면의 경계가 터졌는지 대시보드에서
   * 구분하는 용도라 화면마다 다르게 준다. 안 주면 `ErrorBoundary`로 뭉친다
   */
  name?: string;
  /** 에러가 잡혔을 때 대신 그릴 UI. reset을 부르면 children을 다시 그린다(재시도) */
  fallback: (error: unknown, reset: () => void) => ReactNode;
  /** reset 직전에 호출 — QueryErrorResetBoundary의 reset을 물려 실패한 쿼리를 되살린다 */
  onReset?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

/**
 * 컴포넌트 단위 에러 경계 (KAN-447) — 렌더 중 던져진 에러를 잡아 화면 일부만
 * fallback으로 바꾼다. 라우트 error.tsx가 페이지 전체를 교체하는 것과 달리,
 * 감싼 영역 밖(헤더·다른 섹션)은 살아남는다.
 *
 * 클래스인 이유: getDerivedStateFromError는 훅 대응물이 없다. React가 렌더
 * 에러를 잡는 유일한 통로가 클래스 생명주기라 이 파일만 클래스로 남긴다.
 *
 * 잡은 에러는 componentDidCatch에서 서버에 보고한다(KAN-457). 브라우저 안에서만
 * 끝나던 에러를 프로메테우스 카운터로 셀 수 있게 하는 유일한 통로다.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown): void {
    reportClientError(this.props.name ?? "ErrorBoundary", error);
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}
