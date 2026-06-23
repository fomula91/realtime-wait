import type { ErrorCode } from "./constants.js";

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
