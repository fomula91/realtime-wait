import { beforeEach, describe, expect, it } from "vitest";
import { ERROR_CODES, type QueueEntryRecord } from "@realtime-wait/shared";
import { QueueRepository } from "../src/repositories/queue.repository.js";
import { BoothRepository } from "../src/repositories/booth.repository.js";
import { LogRepository } from "../src/repositories/log.repository.js";
import { BoothService } from "../src/services/booth.service.js";
import { EventService } from "../src/services/event.service.js";
import { QueueService } from "../src/services/queue.service.js";
import { AppError } from "../src/lib/errors.js";
import { nowIso } from "../src/lib/id.js";
import { createTestDb } from "./helpers/test-db.js";

const BOOTH_ID = "booth_test";

let db: D1Database;
let queueRepo: QueueRepository;
let service: QueueService;

beforeEach(async () => {
  db = createTestDb();
  queueRepo = new QueueRepository(db);
  const boothRepo = new BoothRepository(db);
  const logRepo = new LogRepository(db);
  // BoothService 는 queue 경로에서 eventService 를 호출하지 않으므로 미사용 stub.
  const boothService = new BoothService(boothRepo, {} as EventService);
  service = new QueueService(queueRepo, boothRepo, boothService, logRepo);

  const now = nowIso();
  await boothRepo.insert({
    id: BOOTH_ID,
    event_id: "evt_test",
    name: "테스트 부스",
    description: null,
    status: "open",
    current_number: 0,
    created_at: now,
    updated_at: now,
  });
});

async function register(): Promise<QueueEntryRecord> {
  return service.register(BOOTH_ID, {
    participant_name: "홍길동",
    participant_note: null,
  });
}

/** AppError 의 status/code 를 검증한다. */
async function expectAppError(
  promise: Promise<unknown>,
  status: number,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ status, code });
  await promise.catch((err) => {
    expect(err).toBeInstanceOf(AppError);
  });
}

describe("QueueService 상태 전이 (정상 경로)", () => {
  it("등록 → 호출 → 체크인 까지 전이하고 timestamp/부스 번호가 갱신된다", async () => {
    const entry = await register();
    expect(entry.status).toBe("waiting");

    const called = await service.call(entry.id);
    expect(called.status).toBe("called");
    expect(called.called_at).not.toBeNull();

    const booth = await new BoothRepository(db).findById(BOOTH_ID);
    expect(booth?.current_number).toBe(entry.queue_number);

    const checkedIn = await service.checkIn(entry.id);
    expect(checkedIn.status).toBe("checked_in");
    expect(checkedIn.checked_in_at).not.toBeNull();
  });

  it("호출 후 노쇼로 전이된다", async () => {
    const entry = await register();
    await service.call(entry.id);
    const noShow = await service.noShow(entry.id);
    expect(noShow.status).toBe("no_show");
    expect(noShow.no_show_at).not.toBeNull();
  });

  it("waiting 과 called 양쪽에서 취소할 수 있다", async () => {
    const a = await register();
    const cancelledFromWaiting = await service.cancel(a.id);
    expect(cancelledFromWaiting.status).toBe("cancelled");

    const b = await register();
    await service.call(b.id);
    const cancelledFromCalled = await service.cancel(b.id);
    expect(cancelledFromCalled.status).toBe("cancelled");
  });
});

describe("QueueService 잘못된 전이 → 409", () => {
  it("중복 호출(call)은 두 번째에 409 INVALID_STATE_TRANSITION", async () => {
    const entry = await register();
    await service.call(entry.id);
    await expectAppError(
      service.call(entry.id),
      409,
      ERROR_CODES.INVALID_STATE_TRANSITION,
    );
  });

  it("중복 체크인(check-in)은 두 번째에 409", async () => {
    const entry = await register();
    await service.call(entry.id);
    await service.checkIn(entry.id);
    await expectAppError(
      service.checkIn(entry.id),
      409,
      ERROR_CODES.INVALID_STATE_TRANSITION,
    );
  });

  it("호출 전 체크인(waiting → checked_in)은 409", async () => {
    const entry = await register();
    await expectAppError(
      service.checkIn(entry.id),
      409,
      ERROR_CODES.INVALID_STATE_TRANSITION,
    );
  });

  it("중복 노쇼(no-show)는 두 번째에 409", async () => {
    const entry = await register();
    await service.call(entry.id);
    await service.noShow(entry.id);
    await expectAppError(
      service.noShow(entry.id),
      409,
      ERROR_CODES.INVALID_STATE_TRANSITION,
    );
  });

  it("호출 전 노쇼(waiting → no_show)는 409", async () => {
    const entry = await register();
    await expectAppError(
      service.noShow(entry.id),
      409,
      ERROR_CODES.INVALID_STATE_TRANSITION,
    );
  });

  it("중복 취소(cancel)는 두 번째에 409", async () => {
    const entry = await register();
    await service.cancel(entry.id);
    await expectAppError(
      service.cancel(entry.id),
      409,
      ERROR_CODES.INVALID_STATE_TRANSITION,
    );
  });

  it("종료 상태(checked_in)에서는 취소할 수 없다 → 409", async () => {
    const entry = await register();
    await service.call(entry.id);
    await service.checkIn(entry.id);
    await expectAppError(
      service.cancel(entry.id),
      409,
      ERROR_CODES.INVALID_STATE_TRANSITION,
    );
  });
});

describe("조건부 UPDATE 보호 (경합)", () => {
  it("repository.updateStatus 는 현재 상태가 맞을 때만 true, 아니면 false", async () => {
    const entry = await register();

    const first = await queueRepo.updateStatus(
      entry.id,
      "called",
      "called_at",
      nowIso(),
      ["waiting"],
    );
    expect(first).toBe(true);

    // 이미 called 이므로 waiting 조건의 UPDATE 는 0 행 → false
    const second = await queueRepo.updateStatus(
      entry.id,
      "called",
      "called_at",
      nowIso(),
      ["waiting"],
    );
    expect(second).toBe(false);
  });

  it("동시 호출 시 정확히 하나만 성공하고 나머지는 409, 부스 번호는 1회만 전진", async () => {
    const entry = await register();

    const results = await Promise.allSettled([
      service.call(entry.id),
      service.call(entry.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      status: 409,
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
    });

    const booth = await new BoothRepository(db).findById(BOOTH_ID);
    expect(booth?.current_number).toBe(entry.queue_number);
  });
});
