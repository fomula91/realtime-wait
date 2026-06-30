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
app.notFound((c) => {
  // /api 외 경로(SPA 클라이언트 라우트)는 정적 자산으로 폴백한다.
  // not_found_handling=single-page-application 이 미매치 자산을 index.html 로 돌려준다.
  // ASSETS 가 없는 환경(단위 테스트)에서는 기존 JSON 404 를 유지한다.
  const path = new URL(c.req.url).pathname;
  if (c.env.ASSETS && !path.startsWith("/api")) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.json(
    { ok: false, error: { code: "NOT_FOUND", message: "Route not found" } },
    404,
  );
});

export default app;
