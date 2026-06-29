import {
  type BoothRecord,
  type QueueEntryRecord,
  type QueueEntryStatus,
  type QueueEntryStatusView,
  type RegisterQueueInput,
  ERROR_CODES,
} from "@realtime-wait/shared";
import { QueueRepository } from "../repositories/queue.repository.js";
import { BoothRepository } from "../repositories/booth.repository.js";
import { BoothService } from "./booth.service.js";
import { LogRepository } from "../repositories/log.repository.js";
import { AppError } from "../lib/errors.js";
import { genId, nowIso } from "../lib/id.js";

export class QueueService {
  constructor(
    private readonly queue: QueueRepository,
    private readonly booths: BoothRepository,
    private readonly boothService: BoothService,
    private readonly logs: LogRepository,
  ) {}

  /** 참가자 대기 등록 */
  async register(
    boothId: string,
    input: RegisterQueueInput,
  ): Promise<QueueEntryRecord> {
    const booth = await this.boothService.getOrThrow(boothId);
    if (booth.status !== "open") {
      throw new AppError(
        ERROR_CODES.BOOTH_NOT_OPEN,
        "Booth is not open for registration",
        409,
      );
    }

    const nextNumber = (await this.queue.maxQueueNumber(boothId)) + 1;
    const entry: QueueEntryRecord = {
      id: genId("q"),
      event_id: booth.event_id,
      booth_id: boothId,
      participant_name: input.participant_name,
      participant_note: input.participant_note ?? null,
      queue_number: nextNumber,
      status: "waiting",
      created_at: nowIso(),
      called_at: null,
      checked_in_at: null,
      no_show_at: null,
      cancelled_at: null,
    };
    await this.queue.insert(entry);
    await this.logs.recordCall(entry.id, boothId, booth.event_id, "register");
    return entry;
  }

  /** 참가자 상태 조회 (앞 대기 인원 포함) */
  async getStatus(entryId: string): Promise<QueueEntryStatusView> {
    const entry = await this.getOrThrow(entryId);
    const booth = await this.boothService.getOrThrow(entry.booth_id);
    const aheadCount =
      entry.status === "waiting" || entry.status === "called"
        ? await this.queue.countAhead(entry.booth_id, entry.queue_number)
        : 0;
    return {
      ...entry,
      ahead_count: aheadCount,
      booth_name: booth.name,
      booth_current_number: booth.current_number,
    };
  }

  /** 관리자 대기열 조회 */
  async listByBooth(boothId: string): Promise<QueueEntryRecord[]> {
    await this.boothService.getOrThrow(boothId);
    return this.queue.listByBooth(boothId);
  }

  /** 큐 엔트리가 속한 부스를 반환(라우트의 범위 가드용) */
  async boothForEntry(entryId: string): Promise<BoothRecord> {
    const entry = await this.getOrThrow(entryId);
    return this.boothService.getOrThrow(entry.booth_id);
  }

  /** 참가자 취소 (waiting/called 상태에서만 가능) */
  async cancel(entryId: string): Promise<QueueEntryRecord> {
    const entry = await this.getOrThrow(entryId);
    this.assertTransition(entry.status, ["waiting", "called"], "cancel");
    return this.transition(entry, "cancelled", "cancelled_at", "cancel");
  }

  /** 관리자 호출 (waiting → called), 부스 current_number 갱신 */
  async call(entryId: string): Promise<QueueEntryRecord> {
    const entry = await this.getOrThrow(entryId);
    this.assertTransition(entry.status, ["waiting"], "call");
    const updated = await this.transition(entry, "called", "called_at", "call");
    await this.booths.updateCurrentNumber(
      entry.booth_id,
      entry.queue_number,
      nowIso(),
    );
    return updated;
  }

  /** 관리자 체크인 (called → checked_in) */
  async checkIn(entryId: string): Promise<QueueEntryRecord> {
    const entry = await this.getOrThrow(entryId);
    this.assertTransition(entry.status, ["called"], "check-in");
    return this.transition(entry, "checked_in", "checked_in_at", "check_in");
  }

  /** 관리자 노쇼 (called → no_show) */
  async noShow(entryId: string): Promise<QueueEntryRecord> {
    const entry = await this.getOrThrow(entryId);
    this.assertTransition(entry.status, ["called"], "no-show");
    return this.transition(entry, "no_show", "no_show_at", "no_show");
  }

  private async getOrThrow(id: string): Promise<QueueEntryRecord> {
    const entry = await this.queue.findById(id);
    if (!entry) {
      throw AppError.notFound(
        ERROR_CODES.QUEUE_ENTRY_NOT_FOUND,
        "Queue entry not found",
      );
    }
    return entry;
  }

  private assertTransition(
    current: QueueEntryStatus,
    allowedFrom: QueueEntryStatus[],
    action: string,
  ): void {
    if (!allowedFrom.includes(current)) {
      throw new AppError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        `Cannot ${action} from status '${current}'`,
        409,
      );
    }
  }

  private async transition(
    entry: QueueEntryRecord,
    status: QueueEntryStatus,
    timestampColumn: string,
    action: string,
  ): Promise<QueueEntryRecord> {
    const ts = nowIso();
    await this.queue.updateStatus(entry.id, status, timestampColumn, ts);
    await this.logs.recordCall(
      entry.id,
      entry.booth_id,
      entry.event_id,
      action,
    );
    return { ...entry, status, [timestampColumn]: ts };
  }
}
