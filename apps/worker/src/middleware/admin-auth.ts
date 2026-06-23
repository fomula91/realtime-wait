import type { MiddlewareHandler } from "hono";
import { ADMIN_KEY_HEADER } from "@realtime-wait/shared";
import type { AppBindings } from "../env.js";
import { AppError } from "../lib/errors.js";

/**
 * 데모용 관리자 인증.
 * 헤더의 x-admin-key 값이 환경변수 ADMIN_KEY 와 일치해야 한다.
 * MVP 단계의 단순 보호이며 실제 Auth 는 이후 검토한다.
 */
export const adminAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const provided = c.req.header(ADMIN_KEY_HEADER);
  if (!provided || provided !== c.env.ADMIN_KEY) {
    throw AppError.unauthorized("Invalid or missing admin key");
  }
  await next();
};
