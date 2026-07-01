import { Component, type ReactNode } from "react";
import { reportClientError } from "../lib/api.js";

/**
 * React 렌더 크래시를 잡아 폴백 UI 를 보여주고 비콘으로 보고한다 (ADR-0009 관측성).
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportClientError({ source: "render", message: error.message });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-box" role="alert">
          <span>문제가 발생했습니다. 페이지를 새로고침해 주세요.</span>
          <button className="red small" onClick={() => location.reload()}>
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
