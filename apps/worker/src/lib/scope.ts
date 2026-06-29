import type { AdminPrincipal, BoothRecord } from "@realtime-wait/shared";
import { AppError } from "./errors.js";

/** 범위 위반 에러(403) */
function forbidden(message: string): AppError {
  return new AppError("FORBIDDEN", message, 403);
}

/** 슈퍼 어드민 전용 작업 검사(행사 생성 등) */
export function assertSuper(principal: AdminPrincipal): void {
  if (principal.role !== "super") {
    throw forbidden("슈퍼 어드민만 가능한 작업입니다");
  }
}

/**
 * 행사 범위 접근 검사.
 * super: 전체 / event: 자기 행사만 / booth: 행사 단위 접근 불가.
 */
export function assertCanAccessEvent(
  principal: AdminPrincipal,
  eventId: string,
): void {
  if (principal.role === "super") return;
  if (principal.role === "event" && principal.event_id === eventId) return;
  throw forbidden("이 행사에 접근할 권한이 없습니다");
}

/**
 * 부스 범위 접근 검사.
 * super: 전체 / event: 자기 행사의 부스 / booth: 자기 부스만.
 */
export function assertCanAccessBooth(
  principal: AdminPrincipal,
  booth: BoothRecord,
): void {
  if (principal.role === "super") return;
  if (principal.role === "event" && principal.event_id === booth.event_id) return;
  if (principal.role === "booth" && principal.booth_id === booth.id) return;
  throw forbidden("이 부스에 접근할 권한이 없습니다");
}
