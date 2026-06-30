import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN_KEY_HEADER, ADMIN_TOKEN_QUERY } from "@realtime-wait/shared";
import type { AppBindings } from "../src/env.js";
import app from "../src/index.js";
import { createContainer } from "../src/container.js";
import { EventRepository } from "../src/repositories/event.repository.js";
import { BoothRepository } from "../src/repositories/booth.repository.js";
import { TokenRepository } from "../src/repositories/token.repository.js";
import { nowIso } from "../src/lib/id.js";
import { createTestDb } from "./helpers/test-db.js";

const SUPER_KEY = "super-demo-key";
const EVENT_A_TOKEN = "tok_event_a";
const BOOTH_A1_TOKEN = "tok_booth_a1";

let db: D1Database;

/**
 * 두 행사(evt_a/evt_b)와 각 부스(booth_a1/booth_b1),
 * 그리고 evt_a 의 행사 토큰·booth_a1 의 부스 토큰을 심는다.
 * 역할별 범위 경계를 한 DB 위에서 검증하기 위한 최소 픽스처.
 */
beforeEach(async () => {
  db = createTestDb();
  const now = nowIso();
  const events = new EventRepository(db);
  const booths = new BoothRepository(db);
  const tokens = new TokenRepository(db);

  for (const id of ["evt_a", "evt_b"]) {
    await events.insert({
      id,
      name: `행사 ${id}`,
      description: null,
      status: "active",
      starts_at: null,
      ends_at: null,
      created_at: now,
      updated_at: now,
    });
  }
  for (const [id, eventId] of [
    ["booth_a1", "evt_a"],
    ["booth_b1", "evt_b"],
  ] as const) {
    await booths.insert({
      id,
      event_id: eventId,
      name: `부스 ${id}`,
      description: null,
      zone: null,
      status: "open",
      current_number: 0,
      created_at: now,
      updated_at: now,
    });
  }
  await tokens.insert({
    token: EVENT_A_TOKEN,
    role: "event",
    event_id: "evt_a",
    booth_id: null,
    label: "행사 A",
    created_at: now,
    revoked_at: null,
  });
  await tokens.insert({
    token: BOOTH_A1_TOKEN,
    role: "booth",
    event_id: "evt_a",
    booth_id: "booth_a1",
    label: "부스 A1",
    created_at: now,
    revoked_at: null,
  });
});

const ENV = (): AppBindings["Bindings"] => ({
  DB: db,
  ADMIN_KEY: SUPER_KEY,
  ALLOWED_ORIGIN: "*",
});

interface ReqOpts {
  method?: string;
  key?: string; // x-admin-key 헤더
  query?: string; // ?token= 쿼리(QR 딥링크 경로)
  body?: unknown;
}

/** app 으로 admin 요청을 보내고 status 와 파싱된 JSON 바디를 돌려준다. */
async function call(
  path: string,
  opts: ReqOpts = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (opts.key) headers[ADMIN_KEY_HEADER] = opts.key;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const url =
    "http://localhost" +
    path +
    (opts.query ? `?${ADMIN_TOKEN_QUERY}=${opts.query}` : "");
  const res = await app.request(
    url,
    {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    },
    ENV(),
  );
  return { status: res.status, body: await res.json() };
}

describe("adminAuth — 인증 경계", () => {
  it("키가 없으면 401 UNAUTHORIZED", async () => {
    const res = await call("/api/admin/events");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("잘못된 키는 401", async () => {
    const res = await call("/api/admin/events", { key: "wrong-key" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("회수된 토큰은 401(미들웨어가 findActive 로 거른다)", async () => {
    const tokens = new TokenRepository(db);
    await tokens.revokeByEvent("evt_a", nowIso());
    const res = await call("/api/admin/events", { key: EVENT_A_TOKEN });
    expect(res.status).toBe(401);
  });
});

describe("super — 전역 권한", () => {
  it("GET /events 는 전체 행사를 본다", async () => {
    const res = await call("/api/admin/events", { key: SUPER_KEY });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("POST /events 로 행사를 생성한다(201)", async () => {
    const res = await call("/api/admin/events", {
      key: SUPER_KEY,
      method: "POST",
      body: { name: "새 행사" },
    });
    expect(res.status).toBe(201);
  });
});

describe("event 어드민 — 행사 범위", () => {
  it("행사 생성은 슈퍼 전용 → 403 FORBIDDEN", async () => {
    const res = await call("/api/admin/events", {
      key: EVENT_A_TOKEN,
      method: "POST",
      body: { name: "허용 안 됨" },
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("GET /events 는 자기 행사만 본다", async () => {
    const res = await call("/api/admin/events", { key: EVENT_A_TOKEN });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("evt_a");
  });

  it("자기 행사는 조회 가능, 다른 행사는 403", async () => {
    expect((await call("/api/admin/events/evt_a", { key: EVENT_A_TOKEN })).status).toBe(200);
    expect((await call("/api/admin/events/evt_b", { key: EVENT_A_TOKEN })).status).toBe(403);
  });

  it("자기 행사엔 부스 생성 가능, 다른 행사엔 403", async () => {
    const own = await call("/api/admin/events/evt_a/booths", {
      key: EVENT_A_TOKEN,
      method: "POST",
      body: { name: "내 부스" },
    });
    expect(own.status).toBe(201);
    const other = await call("/api/admin/events/evt_b/booths", {
      key: EVENT_A_TOKEN,
      method: "POST",
      body: { name: "남의 부스" },
    });
    expect(other.status).toBe(403);
  });

  it("행사 토큰 회전은 슈퍼 전용 → 403", async () => {
    const res = await call("/api/admin/events/evt_a/token/rotate", {
      key: EVENT_A_TOKEN,
      method: "POST",
    });
    expect(res.status).toBe(403);
  });
});

describe("booth 어드민 — 부스 범위", () => {
  it("자기 부스 대기열은 조회 가능, 다른 부스는 403", async () => {
    expect((await call("/api/admin/booths/booth_a1/queue", { key: BOOTH_A1_TOKEN })).status).toBe(200);
    expect((await call("/api/admin/booths/booth_b1/queue", { key: BOOTH_A1_TOKEN })).status).toBe(403);
  });

  it("행사 단위 목록엔 자기 행사가 보이지 않는다(빈 배열)", async () => {
    const res = await call("/api/admin/events", { key: BOOTH_A1_TOKEN });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("QR 딥링크용 쿼리 토큰(?token=)으로도 인증된다", async () => {
    const res = await call("/api/admin/booths/booth_a1/queue", { query: BOOTH_A1_TOKEN });
    expect(res.status).toBe(200);
  });
});

/**
 * 대기열 상태 변경 라우트의 범위 경계.
 * call/check-in/no-show 는 모두 boothForEntry → assertCanAccessBooth 로 보호된다.
 * 각 action 의 전이 전제 상태(call=waiting, check-in/no-show=called)로 entry 를
 * 심어, 권한 가드가 빠지면 200 으로 통과해버리는 회귀를 잡는다.
 */
const MUTATIONS = [
  { name: "call", suffix: "call", prereq: "waiting" },
  { name: "check-in", suffix: "check-in", prereq: "called" },
  { name: "no-show", suffix: "no-show", prereq: "called" },
] as const;

/** boothId 에 entry 를 만들고 prereq 상태까지 전이시킨 뒤 id 를 돌려준다. */
async function seedEntry(boothId: string, prereq: "waiting" | "called"): Promise<string> {
  const { queueService } = createContainer(db);
  const entry = await queueService.register(boothId, {
    participant_name: "참가자",
    participant_note: null,
  });
  if (prereq === "called") await queueService.call(entry.id);
  return entry.id;
}

function mutate(entryId: string, suffix: string, opts: ReqOpts) {
  return call(`/api/admin/queue/${entryId}/${suffix}`, { ...opts, method: "POST" });
}

describe("대기열 상태 변경 — booth 어드민 범위", () => {
  for (const m of MUTATIONS) {
    it(`자기 부스 entry 는 ${m.name} 가능(200)`, async () => {
      const entryId = await seedEntry("booth_a1", m.prereq);
      const res = await mutate(entryId, m.suffix, { key: BOOTH_A1_TOKEN });
      expect(res.status).toBe(200);
    });

    it(`다른 부스 entry 는 ${m.name} 불가(403)`, async () => {
      const entryId = await seedEntry("booth_b1", m.prereq);
      const res = await mutate(entryId, m.suffix, { key: BOOTH_A1_TOKEN });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  }
});

describe("대기열 상태 변경 — event 어드민 범위", () => {
  for (const m of MUTATIONS) {
    it(`자기 행사 부스 entry 는 ${m.name} 가능(200)`, async () => {
      const entryId = await seedEntry("booth_a1", m.prereq);
      const res = await mutate(entryId, m.suffix, { key: EVENT_A_TOKEN });
      expect(res.status).toBe(200);
    });

    it(`다른 행사 부스 entry 는 ${m.name} 불가(403)`, async () => {
      const entryId = await seedEntry("booth_b1", m.prereq);
      const res = await mutate(entryId, m.suffix, { key: EVENT_A_TOKEN });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  }
});

describe("대기열 상태 변경 — super 는 전체 가능", () => {
  for (const m of MUTATIONS) {
    it(`다른 행사 부스 entry 도 ${m.name} 가능(200)`, async () => {
      const entryId = await seedEntry("booth_b1", m.prereq);
      const res = await mutate(entryId, m.suffix, { key: SUPER_KEY });
      expect(res.status).toBe(200);
    });
  }
});
