import { beforeEach, describe, expect, it } from "vitest";
import type { AppBindings } from "../src/env.js";
import app from "../src/index.js";
import { EventRepository } from "../src/repositories/event.repository.js";
import { BoothRepository } from "../src/repositories/booth.repository.js";
import { nowIso } from "../src/lib/id.js";
import { createTestDb } from "./helpers/test-db.js";

let db: D1Database;

/** 한 행사에 열린 부스(open)와 닫힌 부스(closed)를 심는다. */
beforeEach(async () => {
  db = createTestDb();
  const now = nowIso();
  await new EventRepository(db).insert({
    id: "evt_1",
    name: "행사",
    description: null,
    status: "active",
    starts_at: null,
    ends_at: null,
    created_at: now,
    updated_at: now,
  });
  const booths = new BoothRepository(db);
  for (const [id, status] of [
    ["booth_open", "open"],
    ["booth_closed", "closed"],
  ] as const) {
    await booths.insert({
      id,
      event_id: "evt_1",
      name: `부스 ${id}`,
      description: null,
      zone: null,
      status,
      current_number: 0,
      created_at: now,
      updated_at: now,
    });
  }
});

const ENV = (): AppBindings["Bindings"] => ({
  DB: db,
  ADMIN_KEY: "unused",
  ALLOWED_ORIGIN: "*",
});

/** public 라우트로 요청을 보내고 status 와 파싱된 JSON 바디를 돌려준다. */
async function call(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const res = await app.request(
    "http://localhost" + path,
    {
      method: opts.method ?? "GET",
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : {},
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    },
    ENV(),
  );
  return { status: res.status, body: await res.json() };
}

function register(boothId: string, body: unknown) {
  return call(`/api/events/evt_1/booths/${boothId}/register`, {
    method: "POST",
    body,
  });
}

describe("참가자 흐름 — 등록 → 상태 조회 → 취소", () => {
  it("열린 부스에 등록하면 201 waiting 으로 큐 번호를 받는다", async () => {
    const res = await register("booth_open", { participant_name: "홍길동" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("waiting");
    expect(res.body.data.queue_number).toBe(1);
    expect(res.body.data.booth_id).toBe("booth_open");
  });

  it("등록 후 상태 조회로 앞 대기 인원(ahead_count)과 부스 정보를 본다", async () => {
    const first = await register("booth_open", { participant_name: "선두" });
    const second = await register("booth_open", { participant_name: "후순위" });

    const status = await call(`/api/queue/${second.body.data.id}/status`);
    expect(status.status).toBe(200);
    expect(status.body.data.status).toBe("waiting");
    expect(status.body.data.ahead_count).toBe(1); // 앞에 1명(선두)
    expect(status.body.data.booth_name).toBe("부스 booth_open");

    // 무참조 변수 회피: first 도 흐름의 일부임을 단언
    expect(first.body.data.queue_number).toBe(1);
  });

  it("등록한 대기를 취소하면 cancelled 로 전이되고 상태 조회에 반영된다", async () => {
    const entry = await register("booth_open", { participant_name: "취소할 사람" });

    const cancelled = await call(`/api/queue/${entry.body.data.id}/cancel`, {
      method: "POST",
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("cancelled");

    const status = await call(`/api/queue/${entry.body.data.id}/status`);
    expect(status.body.data.status).toBe("cancelled");
    expect(status.body.data.ahead_count).toBe(0); // 종료 상태는 앞 인원 계산 안 함
  });
});

describe("참가자 흐름 — 오류 경계", () => {
  it("닫힌 부스 등록은 409 BOOTH_NOT_OPEN", async () => {
    const res = await register("booth_closed", { participant_name: "홍길동" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("BOOTH_NOT_OPEN");
  });

  it("없는 queue entry 상태 조회는 404 QUEUE_ENTRY_NOT_FOUND", async () => {
    const res = await call("/api/queue/q_nonexistent/status");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("QUEUE_ENTRY_NOT_FOUND");
  });

  it("없는 queue entry 취소도 404", async () => {
    const res = await call("/api/queue/q_nonexistent/cancel", { method: "POST" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("QUEUE_ENTRY_NOT_FOUND");
  });

  it("잘못된 body(이름 누락) 등록은 400 VALIDATION_ERROR", async () => {
    const res = await register("booth_open", { participant_note: "이름 없음" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("빈 이름(min 위반)도 400 VALIDATION_ERROR", async () => {
    const res = await register("booth_open", { participant_name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("클라이언트 에러 비콘 — POST /api/client-errors (ADR-0009)", () => {
  it("유효한 페이로드는 200 으로 수신 확인한다", async () => {
    const res = await call("/api/client-errors", {
      method: "POST",
      body: { source: "render", message: "TypeError: boom" },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.received).toBe(true);
  });

  it("잘못된 source 는 400 VALIDATION_ERROR", async () => {
    const res = await call("/api/client-errors", {
      method: "POST",
      body: { source: "not-a-source", message: "boom" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("필수 필드(message) 누락도 400 VALIDATION_ERROR", async () => {
    const res = await call("/api/client-errors", {
      method: "POST",
      body: { source: "api" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
