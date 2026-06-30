import type { MiddlewareHandler } from "hono";
import { ADMIN_KEY_HEADER, ADMIN_TOKEN_QUERY } from "@realtime-wait/shared";
import type { AppBindings } from "../env.js";
import { createContainer } from "../container.js";
import { AppError } from "../lib/errors.js";

/**
 * 데모용 관리자 인증.
 * 헤더 x-admin-key 또는 QR 딥링크용 쿼리(token) 로 키/토큰을 받아
 * 역할·범위(principal)로 해석하고 컨텍스트에 주입한다.
 * super 는 환경변수 ADMIN_KEY, event/booth 는 DB 범위 토큰으로 인증한다.
 */
export const adminAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const provided =
    c.req.header(ADMIN_KEY_HEADER) ?? c.req.query(ADMIN_TOKEN_QUERY) ?? "";
  if (!provided) {
    throw AppError.unauthorized("Invalid or missing admin key");
  }
  const { authService } = createContainer(c.env.DB);
  const principal = await authService.resolvePrincipal(provided, c.env.ADMIN_KEY);
  if (!principal) {
    throw AppError.unauthorized("Invalid or missing admin key");
  }
  c.set("principal", principal);
  await next();
};
