export interface Env {
  DB: D1Database;
  ADMIN_KEY: string;
  ALLOWED_ORIGIN: string;
}

/** Hono context 에 주입되는 변수 타입 */
export interface Variables {
  // 현재는 비어 있으나 향후 인증 컨텍스트 등을 위해 예약
}

export type AppBindings = {
  Bindings: Env;
  Variables: Variables;
};
