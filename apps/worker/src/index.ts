import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "./env.js";
import { onError } from "./middleware/error.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { ADMIN_KEY_HEADER } from "@realtime-wait/shared";

const app = new Hono<AppBindings>();

// CORS: 데모에서는 ALLOWED_ORIGIN(기본 *) 으로 허용한다
app.use("*", (c, next) =>
  cors({
    origin: c.env.ALLOWED_ORIGIN || "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", ADMIN_KEY_HEADER],
  })(c, next),
);

app.get("/health", (c) => c.json({ ok: true, data: { status: "healthy" } }));

app.route("/api", publicRoutes);
app.route("/api/admin", adminRoutes);

app.onError(onError);
app.notFound((c) =>
  c.json(
    { ok: false, error: { code: "NOT_FOUND", message: "Route not found" } },
    404,
  ),
);

export default app;
