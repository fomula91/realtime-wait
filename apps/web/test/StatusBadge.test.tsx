import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../src/components/StatusBadge.js";

// Showcase 자랑거리: 상태머신 값 → UI(라벨·아이콘·aria) 매핑을 고정한다.
describe("StatusBadge — 상태 → 라벨/aria 매핑", () => {
  it("waiting 은 '대기중' 라벨·aria-label·클래스를 노출한다", () => {
    render(<StatusBadge status="waiting" />);
    const badge = screen.getByLabelText("상태: 대기중");
    expect(badge).toHaveTextContent("대기중");
    expect(badge).toHaveClass("badge", "waiting");
  });

  it.each([
    ["called", "호출됨"],
    ["checked_in", "체크인"],
    ["no_show", "노쇼"],
    ["cancelled", "취소됨"],
    ["expired", "만료"],
  ] as const)("%s 상태는 '%s' 라벨을 노출한다", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByLabelText(`상태: ${label}`)).toHaveTextContent(label);
  });
});
