import {
  type BoothRecord,
  type CreateBoothInput,
  ERROR_CODES,
} from "@realtime-wait/shared";
import { BoothRepository } from "../repositories/booth.repository.js";
import { EventService } from "./event.service.js";
import { AppError } from "../lib/errors.js";
import { genId, nowIso } from "../lib/id.js";

export class BoothService {
  constructor(
    private readonly booths: BoothRepository,
    private readonly eventService: EventService,
  ) {}

  async create(eventId: string, input: CreateBoothInput): Promise<BoothRecord> {
    await this.eventService.getOrThrow(eventId);
    const now = nowIso();
    const booth: BoothRecord = {
      id: genId("booth"),
      event_id: eventId,
      name: input.name,
      description: input.description ?? null,
      status: "open",
      current_number: 0,
      created_at: now,
      updated_at: now,
    };
    await this.booths.insert(booth);
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
