import { describe, expect, it } from "vitest";
import type { AdminPrincipal, BoothRecord } from "@realtime-wait/shared";
import {
  assertCanAccessBooth,
  assertCanAccessEvent,
  assertSuper,
} from "../src/lib/scope.js";
import { AppError } from "../src/lib/errors.js";

const SUPER: AdminPrincipal = {
  role: "super",
  event_id: null,
  booth_id: null,
  label: "슈퍼 어드민",
};
const EVENT_A: AdminPrincipal = {
  role: "event",
  event_id: "evt_a",
  booth_id: null,
  label: "행사 A",
};
const BOOTH_A1: AdminPrincipal = {
  role: "booth",
  event_id: "evt_a",
  booth_id: "booth_a1",
  label: "부스 A1",
};

/** evt_a 소속 부스 A1. assertCanAccessBooth 가 booth.event_id/id 로 범위를 판단한다. */
const BOOTH_A1_RECORD: BoothRecord = {
  id: "booth_a1",
  event_id: "evt_a",
  name: "부스 A1",
  description: null,
  zone: null,
  status: "open",
  current_number: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};
const BOOTH_B1_RECORD: BoothRecord = { ...BOOTH_A1_RECORD, id: "booth_b1", event_id: "evt_b" };

/** 범위 위반은 403 FORBIDDEN AppError 여야 한다. */
function expectForbidden(fn: () => void): void {
  expect(fn).toThrowError(AppError);
  expect(fn).toThrowError(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
}

describe("assertSuper — 슈퍼 전용 작업", () => {
  it("super 는 통과한다", () => {
    expect(() => assertSuper(SUPER)).not.toThrow();
  });

  it("event/booth 는 403", () => {
    expectForbidden(() => assertSuper(EVENT_A));
    expectForbidden(() => assertSuper(BOOTH_A1));
  });
});

describe("assertCanAccessEvent — 행사 범위", () => {
  it("super 는 모든 행사에 접근", () => {
    expect(() => assertCanAccessEvent(SUPER, "evt_a")).not.toThrow();
    expect(() => assertCanAccessEvent(SUPER, "evt_b")).not.toThrow();
  });

  it("event 는 자기 행사만, 다른 행사는 403", () => {
    expect(() => assertCanAccessEvent(EVENT_A, "evt_a")).not.toThrow();
    expectForbidden(() => assertCanAccessEvent(EVENT_A, "evt_b"));
  });

  it("booth 는 자기 행사라도 행사 단위 접근 불가 → 403", () => {
    expectForbidden(() => assertCanAccessEvent(BOOTH_A1, "evt_a"));
  });
});

describe("assertCanAccessBooth — 부스 범위", () => {
  it("super 는 모든 부스에 접근", () => {
    expect(() => assertCanAccessBooth(SUPER, BOOTH_A1_RECORD)).not.toThrow();
    expect(() => assertCanAccessBooth(SUPER, BOOTH_B1_RECORD)).not.toThrow();
  });

  it("event 는 자기 행사의 부스만, 다른 행사 부스는 403", () => {
    expect(() => assertCanAccessBooth(EVENT_A, BOOTH_A1_RECORD)).not.toThrow();
    expectForbidden(() => assertCanAccessBooth(EVENT_A, BOOTH_B1_RECORD));
  });

  it("booth 는 자기 부스만, 같은 행사의 다른 부스라도 403", () => {
    expect(() => assertCanAccessBooth(BOOTH_A1, BOOTH_A1_RECORD)).not.toThrow();
    const OTHER_IN_SAME_EVENT: BoothRecord = { ...BOOTH_A1_RECORD, id: "booth_a2" };
    expectForbidden(() => assertCanAccessBooth(BOOTH_A1, OTHER_IN_SAME_EVENT));
  });
});
