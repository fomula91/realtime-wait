import {
  type CreateEventInput,
  type EventRecord,
  ERROR_CODES,
} from "@realtime-wait/shared";
import { EventRepository } from "../repositories/event.repository.js";
import { AuthService } from "./auth.service.js";
import { AppError } from "../lib/errors.js";
import { genId, nowIso } from "../lib/id.js";

export class EventService {
  constructor(
    private readonly events: EventRepository,
    private readonly authService: AuthService,
  ) {}

  async create(input: CreateEventInput): Promise<EventRecord> {
    const now = nowIso();
    const event: EventRecord = {
      id: genId("evt"),
      name: input.name,
      description: input.description ?? null,
      status: "active",
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      created_at: now,
      updated_at: now,
    };
    await this.events.insert(event);
    // 행사 어드민 로그인 토큰을 함께 발급한다(데모 인증)
    await this.authService.issueEventToken(event.id, event.name);
    return event;
  }

  async list(): Promise<EventRecord[]> {
    return this.events.list();
  }

  async getOrThrow(id: string): Promise<EventRecord> {
    const event = await this.events.findById(id);
    if (!event) {
      throw AppError.notFound(ERROR_CODES.EVENT_NOT_FOUND, "Event not found");
    }
    return event;
  }
}
