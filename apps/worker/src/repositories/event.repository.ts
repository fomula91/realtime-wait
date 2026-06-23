import type { EventRecord } from "@realtime-wait/shared";

export class EventRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<EventRecord | null> {
    return this.db
      .prepare("SELECT * FROM events WHERE id = ?")
      .bind(id)
      .first<EventRecord>();
  }

  async list(): Promise<EventRecord[]> {
    const res = await this.db
      .prepare("SELECT * FROM events ORDER BY created_at DESC")
      .all<EventRecord>();
    return res.results ?? [];
  }

  async insert(event: EventRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO events (id, name, description, status, starts_at, ends_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        event.id,
        event.name,
        event.description,
        event.status,
        event.starts_at,
        event.ends_at,
        event.created_at,
        event.updated_at,
      )
      .run();
  }
}
