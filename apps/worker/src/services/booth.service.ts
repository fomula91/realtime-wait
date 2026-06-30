import {
  type BoothRecord,
  type CreateBoothInput,
  ERROR_CODES,
} from "@realtime-wait/shared";
import { BoothRepository } from "../repositories/booth.repository.js";
import { EventService } from "./event.service.js";
import { AuthService } from "./auth.service.js";
import { AppError } from "../lib/errors.js";
import { genId, nowIso } from "../lib/id.js";

export class BoothService {
  constructor(
    private readonly booths: BoothRepository,
    private readonly eventService: EventService,
    private readonly authService: AuthService,
  ) {}

  async create(eventId: string, input: CreateBoothInput): Promise<BoothRecord> {
    await this.eventService.getOrThrow(eventId);
    const now = nowIso();
    const booth: BoothRecord = {
      id: genId("booth"),
      event_id: eventId,
      name: input.name,
      description: input.description ?? null,
      zone: input.zone ?? null,
      status: "open",
      current_number: 0,
      created_at: now,
      updated_at: now,
    };
    await this.booths.insert(booth);
    // 부스 어드민 QR 로그인 토큰을 함께 발급한다(데모 인증)
    await this.authService.issueBoothToken(booth.id, booth.event_id, booth.name);
    return booth;
  }

  async listByEvent(eventId: string): Promise<BoothRecord[]> {
    await this.eventService.getOrThrow(eventId);
    return this.booths.listByEvent(eventId);
  }

  async getOrThrow(id: string): Promise<BoothRecord> {
    const booth = await this.booths.findById(id);
    if (!booth) {
      throw AppError.notFound(ERROR_CODES.BOOTH_NOT_FOUND, "Booth not found");
    }
    return booth;
  }
}
