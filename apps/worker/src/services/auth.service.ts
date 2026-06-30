import {
  type AdminPrincipal,
  type AdminTokenRecord,
  type BoothQrItem,
  type BoothRecord,
  type EventRecord,
} from "@realtime-wait/shared";
import { TokenRepository } from "../repositories/token.repository.js";
import { BoothRepository } from "../repositories/booth.repository.js";
import { genId, nowIso } from "../lib/id.js";

/**
 * 데모 인증 서비스.
 * super 는 환경변수 데모 키, event/booth 는 DB 범위 토큰으로 인증한다.
 * 실제 유저 계정/세션은 두지 않는다(포트폴리오 데모 범위).
 */
export class AuthService {
  constructor(
    private readonly tokens: TokenRepository,
    private readonly booths: BoothRepository,
  ) {}

  /** 제공된 키/토큰을 역할·범위(principal)로 해석한다. 실패 시 null. */
  async resolvePrincipal(
    provided: string,
    superKey: string,
  ): Promise<AdminPrincipal | null> {
    if (provided && provided === superKey) {
      return { role: "super", event_id: null, booth_id: null, label: "슈퍼 어드민" };
    }
    const record = await this.tokens.findActive(provided);
    if (!record) return null;
    return {
      role: record.role,
      event_id: record.event_id,
      booth_id: record.booth_id,
      label: record.label,
    };
  }

  /** 행사 어드민 토큰 발급(행사 생성 시 자동 호출) */
  async issueEventToken(eventId: string, label: string): Promise<AdminTokenRecord> {
    const record: AdminTokenRecord = {
      token: genId("tok"),
      role: "event",
      event_id: eventId,
      booth_id: null,
      label,
      created_at: nowIso(),
      revoked_at: null,
    };
    await this.tokens.insert(record);
    return record;
  }

  /** 부스 어드민 토큰 발급(부스 생성 시 자동 호출) */
  async issueBoothToken(
    boothId: string,
    eventId: string,
    label: string,
  ): Promise<AdminTokenRecord> {
    const record: AdminTokenRecord = {
      token: genId("tok"),
      role: "booth",
      event_id: eventId,
      booth_id: boothId,
      label,
      created_at: nowIso(),
      revoked_at: null,
    };
    await this.tokens.insert(record);
    return record;
  }

  /**
   * 행사 어드민 로그인 토큰을 조회한다(슈퍼가 행사 담당자에게 배포).
   * 토큰이 없는 행사(구 데이터)는 즉석에서 발급해 항상 로그인 수단을 제공한다.
   */
  async getEventLogin(event: EventRecord): Promise<AdminTokenRecord> {
    const record = await this.tokens.findActiveByEvent(event.id);
    if (record) return record;
    return this.issueEventToken(event.id, event.name);
  }

  /** 행사 토큰 회전: 기존 토큰을 회수하고 새로 발급(분실·유출 대응, 슈퍼 전용) */
  async rotateEventToken(event: EventRecord): Promise<AdminTokenRecord> {
    await this.tokens.revokeByEvent(event.id, nowIso());
    return this.issueEventToken(event.id, event.name);
  }

  /** 부스 토큰 회전: 기존 토큰을 회수하고 새로 발급(분실·유출 대응) */
  async rotateBoothToken(booth: BoothRecord): Promise<AdminTokenRecord> {
    await this.tokens.revokeByBooth(booth.id, nowIso());
    return this.issueBoothToken(booth.id, booth.event_id, booth.name);
  }

  /** 한 행사의 모든 부스 + 로그인 토큰을 QR 일괄 출력용으로 묶는다 */
  async getBoothQrSheet(eventId: string): Promise<BoothQrItem[]> {
    const booths = await this.booths.listByEvent(eventId);
    const items: BoothQrItem[] = [];
    for (const booth of booths) {
      let record = await this.tokens.findActiveByBooth(booth.id);
      // 토큰이 없는 부스(구 데이터)는 즉석에서 발급해 항상 QR을 제공한다
      if (!record) {
        record = await this.issueBoothToken(booth.id, booth.event_id, booth.name);
      }
      items.push({
        booth_id: booth.id,
        name: booth.name,
        zone: booth.zone,
        token: record.token,
      });
    }
    return items;
  }
}
