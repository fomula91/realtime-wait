import type { Context } from "hono";
import { ZodError } from "zod";
import { ERROR_CODES } from "@realtime-wait/shared";
import { AppError, fail } from "../lib/errors.js";

/** Hono onError 핸들러: 모든 에러를 표준 응답 형식으로 변환 */
export function onError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return fail(c, err.code, err.message, err.status, err.details);
  }

  if (err instanceof ZodError) {
    return fail(
      c,
      ERROR_CODES.VALIDATION_ERROR,
      "Validation failed",
      400,
      err.flatten(),
    );
  }

  console.error("Unhandled error:", err);
  return fail(
    c,
    ERROR_CODES.INTERNAL_ERROR,
    "Internal server error",
    500,
  );
}
