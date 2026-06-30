import { EventRepository } from "./repositories/event.repository.js";
import { BoothRepository } from "./repositories/booth.repository.js";
import { QueueRepository } from "./repositories/queue.repository.js";
import { LogRepository } from "./repositories/log.repository.js";
import { TokenRepository } from "./repositories/token.repository.js";
import { EventService } from "./services/event.service.js";
import { BoothService } from "./services/booth.service.js";
import { QueueService } from "./services/queue.service.js";
import { AuthService } from "./services/auth.service.js";

/** 요청마다 D1 바인딩으로 서비스 그래프를 구성한다 */
export function createContainer(db: D1Database) {
  const eventRepo = new EventRepository(db);
  const boothRepo = new BoothRepository(db);
  const queueRepo = new QueueRepository(db);
  const logRepo = new LogRepository(db);
  const tokenRepo = new TokenRepository(db);

  const authService = new AuthService(tokenRepo, boothRepo);
  const eventService = new EventService(eventRepo, authService);
  const boothService = new BoothService(boothRepo, eventService, authService);
  const queueService = new QueueService(
    queueRepo,
    boothRepo,
    boothService,
    logRepo,
  );

  return { eventService, boothService, queueService, authService };
}

export type Container = ReturnType<typeof createContainer>;
