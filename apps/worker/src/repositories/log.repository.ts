import { genId, nowIso } from "../lib/id.js";

/** call_logs 와 audit_logs 기록 (분석/감사용, 베스트에포트) */
export class LogRepository {
  constructor(private readonly db: D1Database) {}

  async recordCall(
    queueEntryId: string,
    boothId: string,
    eventId: string,
    action: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO call_logs (id, queue_entry_id, booth_id, event_id, action, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(genId("clog"), queueEntryId, boothId, eventId, action, nowIso())
      .run();
  }

  async recordAudit(
    actor: string,
    action: string,
    targetType: string,
    targetId: string,
    payload?: unknown,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO audit_logs (id, actor, action, target_type, target_id, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        genId("audit"),
        actor,
        action,
        targetType,
        targetId,
        payload ? JSON.stringify(payload) : null,
        nowIso(),
      )
      .run();
  }
}
