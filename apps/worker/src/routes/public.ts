import { Hono } from "hono";
import { registerQueueSchema } from "@realtime-wait/shared";
import type { AppBindings } from "../env.js";
import { createContainer } from "../container.js";
import { ok } from "../lib/errors.js";

export const publicRoutes = new Hono<AppBindings>();

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
