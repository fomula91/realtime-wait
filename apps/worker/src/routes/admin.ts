import { Hono } from "hono";
import { createBoothSchema, createEventSchema } from "@realtime-wait/shared";
import type { AppBindings } from "../env.js";
import { createContainer } from "../container.js";
import { ok } from "../lib/errors.js";
import { adminAuth } from "../middleware/admin-auth.js";

export const adminRoutes = new Hono<AppBindings>();

// 모든 admin 라우트는 데모 관리자 키로 보호한다
adminRoutes.use("*", adminAuth);

// POST /api/admin/events
adminRoutes.post("/events", async (c) => {
  const { eventService } = createContainer(c.env.DB);
  const body = createEventSchema.parse(await c.req.json());
  const event = await eventService.create(body);
  return ok(c, event, 201);
});

// GET /api/admin/events
adminRoutes.get("/events", async (c) => {
  const { eventService } = createContainer(c.env.DB);
  return ok(c, await eventService.list());
});

// GET /api/admin/events/:eventId
adminRoutes.get("/events/:eventId", async (c) => {
  const { eventService } = createContainer(c.env.DB);
  const event = await eventService.getOrThrow(c.req.param("eventId"));
  return ok(c, event);
});

// POST /api/admin/events/:eventId/booths
adminRoutes.post("/events/:eventId/booths", async (c) => {
  const { boothService } = createContainer(c.env.DB);
  const body = createBoothSchema.parse(await c.req.json());
  const booth = await boothService.create(c.req.param("eventId"), body);
  return ok(c, booth, 201);
});

// GET /api/admin/events/:eventId/booths
adminRoutes.get("/events/:eventId/booths", async (c) => {
  const { boothService } = createContainer(c.env.DB);
  const booths = await boothService.listByEvent(c.req.param("eventId"));
  return ok(c, booths);
});

// GET /api/admin/booths/:boothId/queue
adminRoutes.get("/booths/:boothId/queue", async (c) => {
  const { queueService } = createContainer(c.env.DB);
  const entries = await queueService.listByBooth(c.req.param("boothId"));
  return ok(c, entries);
});

// POST /api/admin/queue/:queueEntryId/call
adminRoutes.post("/queue/:queueEntryId/call", async (c) => {
  const { queueService } = createContainer(c.env.DB);
  const entry = await queueService.call(c.req.param("queueEntryId"));
  return ok(c, entry);
});

// POST /api/admin/queue/:queueEntryId/check-in
adminRoutes.post("/queue/:queueEntryId/check-in", async (c) => {
  const { queueService } = createContainer(c.env.DB);
  const entry = await queueService.checkIn(c.req.param("queueEntryId"));
  return ok(c, entry);
});

// POST /api/admin/queue/:queueEntryId/no-show
adminRoutes.post("/queue/:queueEntryId/no-show", async (c) => {
  const { queueService } = createContainer(c.env.DB);
  const entry = await queueService.noShow(c.req.param("queueEntryId"));
  return ok(c, entry);
});
