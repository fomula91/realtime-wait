import { describe, it, expect } from "vitest";
import {
  registerQueueSchema,
  clientErrorSchema,
  createEventSchema,
  createBoothSchema,
  queueEntryStatusSchema,
} from "../src/validation.js";

// web↔worker 계약 경계를 스키마 단위로 고정한다 (ADR-0011 · 단일 출처 원칙).

describe("registerQueueSchema — 참가자 등록", () => {
  it("이름만으로 통과한다", () => {
    const r = registerQueueSchema.safeParse({ participant_name: "홍길동" });
    expect(r.success).toBe(true);
  });

  it("빈 이름(min 1)은 거부한다", () => {
    expect(registerQueueSchema.safeParse({ participant_name: "" }).success).toBe(false);
  });

  it("이름 누락은 거부한다", () => {
    expect(registerQueueSchema.safeParse({ participant_note: "메모" }).success).toBe(false);
  });

  it("60자 초과 이름은 거부한다", () => {
    const long = "가".repeat(61);
    expect(registerQueueSchema.safeParse({ participant_name: long }).success).toBe(false);
  });
});

describe("clientErrorSchema — 클라이언트 에러 비콘 (ADR-0009)", () => {
  it("source·message 만으로 통과한다", () => {
    const r = clientErrorSchema.safeParse({ source: "render", message: "boom" });
    expect(r.success).toBe(true);
  });

  it("선택 필드(path·code·userAgent)까지 통과한다", () => {
    const r = clientErrorSchema.safeParse({
      source: "api",
      message: "500",
      path: "/api/x",
      code: "INTERNAL_ERROR",
      userAgent: "UA",
    });
    expect(r.success).toBe(true);
  });

  it("허용되지 않은 source 는 거부한다", () => {
    expect(
      clientErrorSchema.safeParse({ source: "server", message: "boom" }).success,
    ).toBe(false);
  });

  it("message 누락은 거부한다", () => {
    expect(clientErrorSchema.safeParse({ source: "api" }).success).toBe(false);
  });
});

describe("createEvent/createBoothSchema — 관리자 생성", () => {
  it("이벤트: 이름만으로 통과, 빈 이름 거부", () => {
    expect(createEventSchema.safeParse({ name: "행사" }).success).toBe(true);
    expect(createEventSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("이벤트: 잘못된 datetime 형식은 거부한다", () => {
    expect(
      createEventSchema.safeParse({ name: "행사", starts_at: "not-a-date" }).success,
    ).toBe(false);
  });

  it("부스: 이름만으로 통과, 빈 이름 거부", () => {
    expect(createBoothSchema.safeParse({ name: "부스" }).success).toBe(true);
    expect(createBoothSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("queueEntryStatusSchema — 상태 enum 계약", () => {
  it("정의된 6개 상태만 허용한다", () => {
    for (const s of ["waiting", "called", "checked_in", "no_show", "cancelled", "expired"]) {
      expect(queueEntryStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(queueEntryStatusSchema.safeParse("done").success).toBe(false);
  });
});
