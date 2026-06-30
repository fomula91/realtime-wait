import type { AdminRole, ErrorCode } from "./constants.js";

export type EventStatus = "draft" | "active" | "ended";

export type BoothStatus =
  | "draft"
  | "ready"
  | "open"
  | "paused"
  | "closed";

export type QueueEntryStatus =
  | "waiting"
  | "called"
  | "checked_in"
  | "no_show"
  | "cancelled"
  | "expired";

export interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoothRecord {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  /** 행사장 구역(예: "A"). QR 일괄 출력·대규모 운영 화면에서 부스를 묶는 데 쓴다. */
  zone: string | null;
  status: BoothStatus;
  current_number: number;
  created_at: string;
  updated_at: string;
}

export interface QueueEntryRecord {
  id: string;
  event_id: string;
  booth_id: string;
  participant_name: string;
  participant_note: string | null;
  queue_number: number;
  status: QueueEntryStatus;
  created_at: string;
  called_at: string | null;
  checked_in_at: string | null;
  no_show_at: string | null;
  cancelled_at: string | null;
}

/** 참가자 상태 조회 응답: 내 앞에 몇 명 대기 중인지 포함 */
export interface QueueEntryStatusView extends QueueEntryRecord {
  ahead_count: number;
  booth_name: string;
  booth_current_number: number;
}

/**
 * 범위 토큰 레코드(데모 인증).
 * event/booth 역할은 이 토큰으로 인증한다. super 는 환경변수 데모 키를 쓴다.
 */
export interface AdminTokenRecord {
  token: string;
  role: Exclude<AdminRole, "super">;
  event_id: string | null;
  booth_id: string | null;
  label: string;
  created_at: string;
  revoked_at: string | null;
}

/**
 * 인증된 관리자의 역할과 접근 범위.
 * 미들웨어가 토큰을 해석해 만들고, 라우트가 범위 검사에 사용한다.
 */
export interface AdminPrincipal {
  role: AdminRole;
  /** event/booth 역할의 소속 행사. super 는 null. */
  event_id: string | null;
  /** booth 역할의 담당 부스. super/event 는 null. */
  booth_id: string | null;
  /** 화면 표시용 라벨(부스명·행사명·"슈퍼 어드민"). */
  label: string;
}

/** 부스 QR 일괄 출력용 항목: 부스 정보 + 로그인 토큰 */
export interface BoothQrItem {
  booth_id: string;
  name: string;
  zone: string | null;
  token: string;
}

/** 표준 API 응답 형식 */
export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
