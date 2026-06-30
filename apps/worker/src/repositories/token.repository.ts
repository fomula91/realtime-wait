import type { AdminTokenRecord } from "@realtime-wait/shared";

/** 데모 인증용 범위 토큰(admin_tokens) 저장소 */
export class TokenRepository {
  constructor(private readonly db: D1Database) {}

  /** 유효한(미회수) 토큰을 찾는다 */
  async findActive(token: string): Promise<AdminTokenRecord | null> {
    return this.db
      .prepare("SELECT * FROM admin_tokens WHERE token = ? AND revoked_at IS NULL")
      .bind(token)
      .first<AdminTokenRecord>();
  }

  /** 한 행사의 유효한 행사-어드민 토큰을 찾는다(부스 토큰은 제외) */
  async findActiveByEvent(eventId: string): Promise<AdminTokenRecord | null> {
    return this.db
      .prepare(
        "SELECT * FROM admin_tokens WHERE event_id = ? AND role = 'event' AND revoked_at IS NULL",
      )
      .bind(eventId)
      .first<AdminTokenRecord>();
  }

  /** 한 부스의 유효한 토큰을 찾는다 */
  async findActiveByBooth(boothId: string): Promise<AdminTokenRecord | null> {
    return this.db
      .prepare(
        "SELECT * FROM admin_tokens WHERE booth_id = ? AND revoked_at IS NULL",
      )
      .bind(boothId)
      .first<AdminTokenRecord>();
  }

  /** 한 행사에 속한 부스 토큰들을 부스 생성순으로 반환(QR 일괄 출력용) */
  async listActiveBoothTokensByEvent(
    eventId: string,
  ): Promise<AdminTokenRecord[]> {
    const res = await this.db
      .prepare(
        `SELECT t.* FROM admin_tokens t
         JOIN booths b ON b.id = t.booth_id
         WHERE t.event_id = ? AND t.role = 'booth' AND t.revoked_at IS NULL
         ORDER BY b.created_at ASC`,
      )
      .bind(eventId)
      .all<AdminTokenRecord>();
    return res.results ?? [];
  }

  async insert(record: AdminTokenRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO admin_tokens (token, role, event_id, booth_id, label, created_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.token,
        record.role,
        record.event_id,
        record.booth_id,
        record.label,
        record.created_at,
        record.revoked_at,
      )
      .run();
  }

  /** 행사의 기존 유효 행사-어드민 토큰을 회수(재발급 시 호출, 부스 토큰은 보존) */
  async revokeByEvent(eventId: string, revokedAt: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE admin_tokens SET revoked_at = ? WHERE event_id = ? AND role = 'event' AND revoked_at IS NULL",
      )
      .bind(revokedAt, eventId)
      .run();
  }

  /** 부스의 기존 유효 토큰을 모두 회수(재발급 시 호출) */
  async revokeByBooth(boothId: string, revokedAt: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE admin_tokens SET revoked_at = ? WHERE booth_id = ? AND revoked_at IS NULL",
      )
      .bind(revokedAt, boothId)
      .run();
  }
}
