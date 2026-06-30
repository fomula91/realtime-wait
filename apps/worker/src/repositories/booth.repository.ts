import type { BoothRecord } from "@realtime-wait/shared";

export class BoothRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<BoothRecord | null> {
    return this.db
      .prepare("SELECT * FROM booths WHERE id = ?")
      .bind(id)
      .first<BoothRecord>();
  }

  async listByEvent(eventId: string): Promise<BoothRecord[]> {
    const res = await this.db
      .prepare("SELECT * FROM booths WHERE event_id = ? ORDER BY created_at ASC")
      .bind(eventId)
      .all<BoothRecord>();
    return res.results ?? [];
  }

  async insert(booth: BoothRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO booths (id, event_id, name, description, zone, status, current_number, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        booth.id,
        booth.event_id,
        booth.name,
        booth.description,
        booth.zone,
        booth.status,
        booth.current_number,
        booth.created_at,
        booth.updated_at,
      )
      .run();
  }

  /** current_number 를 새 값으로 갱신 */
  /**
   * "현재 진행 번호"를 전진시킨다. 역순 호출(작은 번호를 나중에 호출)에도
   * 표시가 뒤로 가지 않도록, 더 큰 번호일 때만 갱신한다(단조 증가).
   */
  async updateCurrentNumber(
    id: string,
    currentNumber: number,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .prepare(
        "UPDATE booths SET current_number = ?, updated_at = ? WHERE id = ? AND ? > current_number",
      )
      .bind(currentNumber, updatedAt, id, currentNumber)
      .run();
  }
}
