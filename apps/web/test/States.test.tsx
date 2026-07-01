import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorRetry, EmptyState, SkeletonRows } from "../src/components/States.js";

describe("States — 로딩/에러/빈 상태 공통 표현", () => {
  it("ErrorRetry: 메시지를 alert 로 표시하고 버튼 클릭 시 onRetry 를 호출한다", () => {
    const onRetry = vi.fn();
    render(<ErrorRetry message="불러오기 실패" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("불러오기 실패");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("EmptyState: title 과 sub 를 표시한다", () => {
    render(<EmptyState title="아직 없음" sub="곧 채워집니다" />);
    expect(screen.getByText("아직 없음")).toBeInTheDocument();
    expect(screen.getByText("곧 채워집니다")).toBeInTheDocument();
  });

  it("SkeletonRows: count 만큼 스켈레톤 행을 그린다", () => {
    const { container } = render(<SkeletonRows count={4} />);
    expect(container.querySelectorAll(".skel-row")).toHaveLength(4);
  });
});
