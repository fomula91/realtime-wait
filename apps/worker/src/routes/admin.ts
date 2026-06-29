import { Hono } from "hono";
import { createBoothSchema, createEventSchema } from "@realtime-wait/shared";
import type { AppBindings } from "../env.js";
import { createContainer } from "../container.js";
import { ok } from "../lib/errors.js";
import { adminAuth } from "../middleware/admin-auth.js";
import {
  assertCanAccessBooth,
  assertCanAccessEvent,
  assertSuper,
} from "../lib/scope.js";

export const adminRoutes = new Hono<AppBindings>();

// 모든 admin 라우트는 데모 키/토큰으로 보호되며, principal(역할·범위)을 주입한다
adminRoutes.use("*", adminAuth);

// GET /api/admin/me — 현재 로그인한 관리자의 역할·범위
adminRoutes.get("/me", (c) => ok(c, c.get("principal")));

// POST /api/admin/events — 행사 생성(슈퍼 전용)
adminRoutes.post("/events", async (c) => {
  assertSuper(c.get("principal"));
  const { eventService } = createContainer(c.env.DB);
  const body = createEventSchema.parse(await c.req.json());
  const event = await eventService.create(body);
  return ok(c, event, 201);
});

// GET /api/admin/events — 범위에 맞는 행사 목록(슈퍼=전체, 행사=자기 행사)
adminRoutes.get("/events", async (c) => {
  const principal = c.get("principal");
  const { eventService } = createContainer(c.env.DB);
  if (principal.role === "super") {
    return ok(c, await eventService.list());
  }
  if (principal.role === "event" && principal.event_id) {
    return ok(c, [await eventService.getOrThrow(principal.event_id)]);
  }
  return ok(c, []);
});

// GET /api/admin/events/:eventId
adminRoutes.get("/events/:eventId", async (c) => {
  const eventId = c.req.param("eventId");
  assertCanAccessEvent(c.get("principal"), eventId);
  const { eventService } = createContainer(c.env.DB);
  return ok(c, await eventService.getOrThrow(eventId));
});

// POST /api/admin/events/:eventId/booths — 부스 생성(슈퍼·행사)
adminRoutes.post("/events/:eventId/booths", async (c) => {
  const eventId = c.req.param("eventId");
  assertCanAccessEvent(c.get("principal"), eventId);
  const { boothService } = createContainer(c.env.DB);
  const body = createBoothSchema.parse(await c.req.json());
  const booth = await boothService.create(eventId, body);
  return ok(c, booth, 201);
});

// GET /api/admin/events/:eventId/booths
adminRoutes.get("/events/:eventId/booths", async (c) => {
  const eventId = c.req.param("eventId");
  assertCanAccessEvent(c.get("principal"), eventId);
  const { boothService } = createContainer(c.env.DB);
  return ok(c, await boothService.listByEvent(eventId));
});

// GET /api/admin/events/:eventId/token — 행사 어드민 로그인 토큰 조회(슈퍼·행사)
adminRoutes.get("/events/:eventId/token", async (c) => {
  const eventId = c.req.param("eventId");
  assertCanAccessEvent(c.get("principal"), eventId);
  const { eventService, authService } = createContainer(c.env.DB);
  const event = await eventService.getOrThrow(eventId);
  return ok(c, await authService.getEventLogin(event));
});

// POST /api/admin/events/:eventId/token/rotate — 행사 토큰 회전(슈퍼 전용)
adminRoutes.post("/events/:eventId/token/rotate", async (c) => {
  assertSuper(c.get("principal"));
  const eventId = c.req.param("eventId");
  const { eventService, authService } = createContainer(c.env.DB);
  const event = await eventService.getOrThrow(eventId);
  return ok(c, await authService.rotateEventToken(event));
});

// GET /api/admin/events/:eventId/qr-sheet — 부스 로그인 QR 일괄 출력(슈퍼·행사)
adminRoutes.get("/events/:eventId/qr-sheet", async (c) => {
  const eventId = c.req.param("eventId");
  assertCanAccessEvent(c.get("principal"), eventId);
  const { authService } = createContainer(c.env.DB);
  return ok(c, await authService.getBoothQrSheet(eventId));
});

// GET /api/admin/booths/:boothId/queue
adminRoutes.get("/booths/:boothId/queue", async (c) => {
  const { boothService, queueService } = createContainer(c.env.DB);
  const booth = await boothService.getOrThrow(c.req.param("boothId"));
  assertCanAccessBooth(c.get("principal"), booth);
  return ok(c, await queueService.listByBooth(booth.id));
});

// POST /api/admin/booths/:boothId/token/rotate — 부스 QR 토큰 회전(슈퍼·행사)
adminRoutes.post("/booths/:boothId/token/rotate", async (c) => {
  const { boothService, authService } = createContainer(c.env.DB);
  const booth = await boothService.getOrThrow(c.req.param("boothId"));
  assertCanAccessEvent(c.get("principal"), booth.event_id);
  return ok(c, await authService.rotateBoothToken(booth));
});

// POST /api/admin/queue/:queueEntryId/call
adminRoutes.post("/queue/:queueEntryId/call", async (c) => {
  const entryId = c.req.param("queueEntryId");
  const { queueService } = createContainer(c.env.DB);
  assertCanAccessBooth(c.get("principal"), await queueService.boothForEntry(entryId));
  return ok(c, await queueService.call(entryId));
});

// POST /api/admin/queue/:queueEntryId/check-in
adminRoutes.post("/queue/:queueEntryId/check-in", async (c) => {
  const entryId = c.req.param("queueEntryId");
  const { queueService } = createContainer(c.env.DB);
  assertCanAccessBooth(c.get("principal"), await queueService.boothForEntry(entryId));
  return ok(c, await queueService.checkIn(entryId));
});

// POST /api/admin/queue/:queueEntryId/no-show
adminRoutes.post("/queue/:queueEntryId/no-show", async (c) => {
  const entryId = c.req.param("queueEntryId");
  const { queueService } = createContainer(c.env.DB);
  assertCanAccessBooth(c.get("principal"), await queueService.boothForEntry(entryId));
  return ok(c, await queueService.noShow(entryId));
});
