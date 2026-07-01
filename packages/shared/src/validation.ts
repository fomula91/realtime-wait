import { z } from "zod";

export const eventStatusSchema = z.enum(["draft", "active", "ended"]);

export const boothStatusSchema = z.enum([
  "draft",
  "ready",
  "open",
  "paused",
  "closed",
]);

export const queueEntryStatusSchema = z.enum([
  "waiting",
  "called",
  "checked_in",
  "no_show",
  "cancelled",
  "expired",
]);

/** 관리자: 이벤트 생성 */
export const createEventSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** 관리자: 부스 생성 */
export const createBoothSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  zone: z.string().max(40).optional(),
});
export type CreateBoothInput = z.infer<typeof createBoothSchema>;

/** 참가자: 대기 등록 (실제 개인정보는 수집하지 않으며 표시용 이름만 받는다) */
export const registerQueueSchema = z.object({
  participant_name: z.string().min(1).max(60),
  participant_note: z.string().max(200).optional(),
});
export type RegisterQueueInput = z.infer<typeof registerQueueSchema>;

/**
 * 클라이언트 에러 비콘 페이로드 (ADR-0009 관측성).
 * source: api = 예기치 못한 API 실패(5xx/네트워크), render = ErrorBoundary 렌더 크래시.
 * 에러 메타만 담고 개인정보는 수집하지 않는다.
 */
export const clientErrorSchema = z.object({
  source: z.enum(["api", "render"]),
  message: z.string().min(1).max(500),
  path: z.string().max(300).optional(),
  code: z.string().max(60).optional(),
  userAgent: z.string().max(300).optional(),
});
export type ClientErrorInput = z.infer<typeof clientErrorSchema>;
