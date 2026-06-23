/** 참가자 화면 polling 주기 (ms) */
export const PARTICIPANT_POLL_INTERVAL_MS = 5000;

/** 관리자 대기열 화면 polling 주기 (ms) */
export const ADMIN_POLL_INTERVAL_MS = 3000;

/** 관리자 API 보호용 데모 키 헤더 이름 */
export const ADMIN_KEY_HEADER = "x-admin-key";

/** 표준 에러 코드 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  BOOTH_NOT_FOUND: "BOOTH_NOT_FOUND",
  QUEUE_ENTRY_NOT_FOUND: "QUEUE_ENTRY_NOT_FOUND",
  BOOTH_NOT_OPEN: "BOOTH_NOT_OPEN",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
