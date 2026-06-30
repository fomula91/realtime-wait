import type { QueueEntryRecord, QueueEntryStatus } from "@realtime-wait/shared";

export class QueueRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<QueueEntryRecord | null> {
    return this.db
      .prepare("SELECT * FROM queue_entries WHERE id = ?")
      .bind(id)
      .first<QueueEntryRecord>();
  }

  async listByBooth(boothId: string): Promise<QueueEntryRecord[]> {
    const res = await this.db
      .prepare(
        "SELECT * FROM queue_entries WHERE booth_id = ? ORDER BY queue_number ASC",
      )
      .bind(boothId)
      .all<QueueEntryRecord>();
    return res.results ?? [];
  }

  /** 부스 내 가장 큰 queue_number 조회 (없으면 0) */
  async maxQueueNumber(boothId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COALESCE(MAX(queue_number), 0) AS max_num FROM queue_entries WHERE booth_id = ?",
      )
      .bind(boothId)
      .first<{ max_num: number }>();
    return row?.max_num ?? 0;
  }

  /** 특정 entry 앞에서 아직 대기(waiting/called) 중인 인원 수 */
  async countAhead(boothId: string, queueNumber: number): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM queue_entries
         WHERE booth_id = ? AND queue_number < ? AND status IN ('waiting', 'called')`,
      )
      .bind(boothId, queueNumber)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  }

  async insert(entry: QueueEntryRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO queue_entries
           (id, event_id, booth_id, participant_name, participant_note, queue_number, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        entry.id,
        entry.event_id,
        entry.booth_id,
        entry.participant_name,
        entry.participant_note,
        entry.queue_number,
        entry.status,
        entry.created_at,
      )
      .run();
  }

  /**
   * 조건부 상태 전이: 현재 상태가 allowedFrom 중 하나일 때만 갱신한다.
   * 갱신된 행이 있으면(=전이 성공) true, 없으면(=경합/잘못된 상태) false 를 반환한다.
   */
  async updateStatus(
    id: string,
    status: QueueEntryStatus,
    timestampColumn: string | null,
    timestamp: string,
    allowedFrom: QueueEntryStatus[],
  ): Promise<boolean> {
    const placeholders = allowedFrom.map(() => "?").join(", ");
    const setClause = timestampColumn
      ? `status = ?, ${timestampColumn} = ?`
      : "status = ?";
    const setBinds = timestampColumn ? [status, timestamp] : [status];

    const res = await this.db
      .prepare(
        `UPDATE queue_entries SET ${setClause}
         WHERE id = ? AND status IN (${placeholders})`,
      )
      .bind(...setBinds, id, ...allowedFrom)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  }
}
