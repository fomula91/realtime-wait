import type { AdminPrincipal } from "@realtime-wait/shared";

export interface Env {
  DB: D1Database;
  ADMIN_KEY: string;
  ALLOWED_ORIGIN: string;
}

/** Hono context 에 주입되는 변수 타입 */
export interface Variables {
  /** adminAuth 미들웨어가 해석한 현재 관리자의 역할·범위 */
  principal: AdminPrincipal;
}

export type AppBindings = {
  Bindings: Env;
  Variables: Variables;
};
