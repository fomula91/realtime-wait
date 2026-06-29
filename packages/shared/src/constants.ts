/** 참가자 화면 polling 주기 (ms) */
export const PARTICIPANT_POLL_INTERVAL_MS = 5000;

/** 관리자 대기열 화면 polling 주기 (ms) */
export const ADMIN_POLL_INTERVAL_MS = 3000;

/** 관리자 API 보호용 데모 키/토큰 헤더 이름 */
export const ADMIN_KEY_HEADER = "x-admin-key";

/**
 * QR 로그인용 토큰 쿼리 파라미터 이름.
 * 부스 QR 딥링크(`/booth/:boothId?token=...`)가 이 값으로 토큰을 전달한다.
 */
export const ADMIN_TOKEN_QUERY = "token";

/**
 * 관리자 역할 3단계. 상위 역할은 하위 범위를 모두 포함한다(super ⊃ event ⊃ booth).
 * super 는 환경변수 데모 키, event/booth 는 DB 의 범위 토큰으로 인증한다.
 */
export const ADMIN_ROLES = {
  SUPER: "super",
  EVENT: "event",
  BOOTH: "booth",
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

/** 표준 에러 코드 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  BOOTH_NOT_FOUND: "BOOTH_NOT_FOUND",
  QUEUE_ENTRY_NOT_FOUND: "QUEUE_ENTRY_NOT_FOUND",
  BOOTH_NOT_OPEN: "BOOTH_NOT_OPEN",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
