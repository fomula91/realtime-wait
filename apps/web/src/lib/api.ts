import type {
  AdminPrincipal,
  AdminTokenRecord,
  ApiResponse,
  BoothQrItem,
  BoothRecord,
  CreateBoothInput,
  CreateEventInput,
  EventRecord,
  QueueEntryRecord,
  QueueEntryStatusView,
  RegisterQueueInput,
} from "@realtime-wait/shared";
import { ADMIN_KEY_HEADER } from "@realtime-wait/shared";

/** API 호출 실패 시 던지는 에러 (표준 error 형식 보존) */
export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * 클라이언트 에러 비콘 (ADR-0009 관측성). best-effort — 실패해도 본 경로를 막지 않는다.
 * 에러 메타만 담고 개인정보는 보내지 않는다.
 */
export function reportClientError(payload: {
  source: "api" | "render";
  message: string;
  path?: string;
  code?: string;
}): void {
  try {
    const body = JSON.stringify({
      ...payload,
      path: payload.path ?? location.pathname,
      userAgent: navigator.userAgent,
    });
    navigator.sendBeacon?.(
      "/api/client-errors",
      new Blob([body], { type: "application/json" }),
    );
  } catch {
    /* best-effort: 비콘 실패는 무시 */
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { adminKey?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (init?.adminKey) headers.set(ADMIN_KEY_HEADER, init.adminKey);

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch (err) {
    // 네트워크 실패는 예기치 못한 에러로 보고한다.
    reportClientError({ source: "api", message: `network error: ${String(err)}`, path });
    throw err;
  }
  const json = (await res.json()) as ApiResponse<T>;

  if (!json.ok) {
    // 예기치 못한 서버 장애(5xx)만 보고한다. 도메인 4xx(409/404/400)는 정상 신호라 제외.
    if (res.status >= 500) {
      reportClientError({
        source: "api",
        message: json.error.message,
        code: json.error.code,
        path,
      });
    }
    throw new ApiClientError(json.error.code, json.error.message);
  }
  return json.data;
}

// --- Public ---
export const api = {
  getEvent: (eventId: string) =>
    request<EventRecord>(`/api/events/${eventId}`),

  listBooths: (eventId: string) =>
    request<BoothRecord[]>(`/api/events/${eventId}/booths`),

  register: (eventId: string, boothId: string, input: RegisterQueueInput) =>
    request<QueueEntryRecord>(
      `/api/events/${eventId}/booths/${boothId}/register`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  getStatus: (queueEntryId: string) =>
    request<QueueEntryStatusView>(`/api/queue/${queueEntryId}/status`),

  cancel: (queueEntryId: string) =>
    request<QueueEntryRecord>(`/api/queue/${queueEntryId}/cancel`, {
      method: "POST",
    }),
};

// --- Admin (데모 키/토큰 필요) ---
export const adminApi = {
  /** 제공한 키/토큰의 역할·범위(principal)를 확인한다 (로그인·가드용) */
  getMe: (adminKey: string) =>
    request<AdminPrincipal>(`/api/admin/me`, { adminKey }),

  createEvent: (adminKey: string, input: CreateEventInput) =>
    request<EventRecord>(`/api/admin/events`, {
      method: "POST",
      body: JSON.stringify(input),
      adminKey,
    }),

  listEvents: (adminKey: string) =>
    request<EventRecord[]>(`/api/admin/events`, { adminKey }),

  createBooth: (adminKey: string, eventId: string, input: CreateBoothInput) =>
    request<BoothRecord>(`/api/admin/events/${eventId}/booths`, {
      method: "POST",
      body: JSON.stringify(input),
      adminKey,
    }),

  listBooths: (adminKey: string, eventId: string) =>
    request<BoothRecord[]>(`/api/admin/events/${eventId}/booths`, { adminKey }),

  listQueue: (adminKey: string, boothId: string) =>
    request<QueueEntryRecord[]>(`/api/admin/booths/${boothId}/queue`, {
      adminKey,
    }),

  call: (adminKey: string, queueEntryId: string) =>
    request<QueueEntryRecord>(`/api/admin/queue/${queueEntryId}/call`, {
      method: "POST",
      adminKey,
    }),

  checkIn: (adminKey: string, queueEntryId: string) =>
    request<QueueEntryRecord>(`/api/admin/queue/${queueEntryId}/check-in`, {
      method: "POST",
      adminKey,
    }),

  noShow: (adminKey: string, queueEntryId: string) =>
    request<QueueEntryRecord>(`/api/admin/queue/${queueEntryId}/no-show`, {
      method: "POST",
      adminKey,
    }),

  /** 행사 어드민 로그인 토큰 조회 — 슈퍼가 행사 담당자에게 배포 (슈퍼·행사) */
  getEventToken: (adminKey: string, eventId: string) =>
    request<AdminTokenRecord>(`/api/admin/events/${eventId}/token`, { adminKey }),

  /** 행사 로그인 토큰 회전 — 분실·유출 시 무효화 후 재발급 (슈퍼 전용) */
  rotateEventToken: (adminKey: string, eventId: string) =>
    request<AdminTokenRecord>(`/api/admin/events/${eventId}/token/rotate`, {
      method: "POST",
      adminKey,
    }),

  /** 한 행사의 부스 로그인 QR 일괄 출력 목록 (슈퍼·행사) */
  getQrSheet: (adminKey: string, eventId: string) =>
    request<BoothQrItem[]>(`/api/admin/events/${eventId}/qr-sheet`, { adminKey }),

  /** 부스 로그인 토큰 회전 — 분실·유출 시 무효화 후 재발급 (슈퍼·행사) */
  rotateBoothToken: (adminKey: string, boothId: string) =>
    request<AdminTokenRecord>(`/api/admin/booths/${boothId}/token/rotate`, {
      method: "POST",
      adminKey,
    }),
};
