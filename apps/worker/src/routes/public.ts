import { Hono } from "hono";
import { registerQueueSchema, clientErrorSchema } from "@realtime-wait/shared";
import type { AppBindings } from "../env.js";
import { createContainer } from "../container.js";
import { ok } from "../lib/errors.js";

export const publicRoutes = new Hono<AppBindings>();

// POST /api/client-errors — 프론트 에러 비콘 수집 (ADR-0009 관측성).
// 최소 페이로드·PII 미수집. 클라이언트 에러는 서버 에러와 구분되게 별도 태그로 로깅한다.
publicRoutes.post("/client-errors", async (c) => {
  const body = clientErrorSchema.parse(await c.req.json());
  console.warn(JSON.stringify({ tag: "client_error", ...body }));
  return ok(c, { received: true });
});

// GET /api/events/:eventId
publicRoutes.get("/events/:eventId", async (c) => {
  const { eventService } = createContainer(c.env.DB);
  const event = await eventService.getOrThrow(c.req.param("eventId"));
  return ok(c, event);
});

// GET /api/events/:eventId/booths
publicRoutes.get("/events/:eventId/booths", async (c) => {
  const { boothService } = createContainer(c.env.DB);
  const booths = await boothService.listByEvent(c.req.param("eventId"));
  return ok(c, booths);
});

// POST /api/events/:eventId/booths/:boothId/register
publicRoutes.post(
  "/events/:eventId/booths/:boothId/register",
  async (c) => {
    const { queueService } = createContainer(c.env.DB);
    const body = registerQueueSchema.parse(await c.req.json());
    const entry = await queueService.register(c.req.param("boothId"), body);
    return ok(c, entry, 201);
  },
);

// GET /api/queue/:queueEntryId/status
publicRoutes.get("/queue/:queueEntryId/status", async (c) => {
  const { queueService } = createContainer(c.env.DB);
  const status = await queueService.getStatus(c.req.param("queueEntryId"));
  return ok(c, status);
});

// POST /api/queue/:queueEntryId/cancel
publicRoutes.post("/queue/:queueEntryId/cancel", async (c) => {
  const { queueService } = createContainer(c.env.DB);
  const entry = await queueService.cancel(c.req.param("queueEntryId"));
  return ok(c, entry);
});
