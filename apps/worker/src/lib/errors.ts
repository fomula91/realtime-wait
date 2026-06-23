import type { Context } from "hono";
import type { ApiError, ApiSuccess } from "@realtime-wait/shared";
import { type ErrorCode, ERROR_CODES } from "@realtime-wait/shared";

/** 서비스 계층에서 던지는 도메인 에러 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static notFound(code: ErrorCode, message: string): AppError {
    return new AppError(code, message, 404);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(ERROR_CODES.UNAUTHORIZED, message, 401);
  }
}

/** 성공 응답 헬퍼 */
export function ok<T>(c: Context, data: T, status = 200) {
  const body: ApiSuccess<T> = { ok: true, data };
  return c.json(body, status as 200);
}

/** 실패 응답 헬퍼 */
export function fail(
  c: Context,
  code: ErrorCode,
  message: string,
  status = 400,
  details?: unknown,
) {
  const body: ApiError = { ok: false, error: { code, message, details } };
  return c.json(body, status as 400);
}
