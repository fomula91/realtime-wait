import type { Context } from "hono";
import { ZodError } from "zod";
import { ERROR_CODES } from "@realtime-wait/shared";
import { AppError, fail } from "../lib/errors.js";

/**
 * 관측성(ADR-0009): 에러를 구조화 로그로 남긴다.
 * 5xx(예기치 못한 장애)는 error, 4xx(정상 도메인 신호 — 409 등)는 warn 으로 분리해
 * 409/404/400 이 error 로그를 오염시키지 않게 한다.
 */
function logError(c: Context, code: string, status: number, err: Error) {
  const entry = JSON.stringify({
    tag: "api_error",
    code,
    status,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    message: err.message,
  });
  if (status >= 500) console.error(entry);
  else console.warn(entry);
}

/** Hono onError 핸들러: 모든 에러를 표준 응답 형식으로 변환 + 구조화 로깅 */
export function onError(err: Error, c: Context) {
  if (err instanceof AppError) {
    logError(c, err.code, err.status, err);
    return fail(c, err.code, err.message, err.status, err.details);
  }

  if (err instanceof ZodError) {
    logError(c, ERROR_CODES.VALIDATION_ERROR, 400, err);
    return fail(
      c,
      ERROR_CODES.VALIDATION_ERROR,
      "Validation failed",
      400,
      err.flatten(),
    );
  }

  logError(c, ERROR_CODES.INTERNAL_ERROR, 500, err);
  return fail(
    c,
    ERROR_CODES.INTERNAL_ERROR,
    "Internal server error",
    500,
  );
}
