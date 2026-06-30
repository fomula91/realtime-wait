import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// node:sqlite 는 Vite 5 의 모듈 리졸버가 처리하지 못하므로(정적 import 시 'node:'
// 가 떨어져 나감) 런타임 require 로 우회 로드한다.
const { DatabaseSync } =
  createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = InstanceType<typeof DatabaseSync>;

/**
 * 테스트용 D1 셰임.
 *
 * Cloudflare D1 의 prepare/bind/first/all/run 인터페이스를, 의존성 없이
 * Node 내장 node:sqlite 위에 최소 구현한다. repository 가 실제 SQL(조건부
 * UPDATE 의 `meta.changes` 포함)을 그대로 실행하므로, 상태 전이 보호 로직을
 * 실제 SQL 엔진 위에서 검증할 수 있다.
 */

const SCHEMA_PATH = fileURLToPath(
  new URL("../../../../db/schema.sql", import.meta.url),
);

class ShimStatement {
  private params: unknown[] = [];
  constructor(private readonly stmt: ReturnType<DatabaseSync["prepare"]>) {}

  bind(...args: unknown[]): this {
    this.params = args;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    return (this.stmt.get(...(this.params as never[])) as T) ?? null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    return { results: this.stmt.all(...(this.params as never[])) as T[] };
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const res = this.stmt.run(...(this.params as never[]));
    return { meta: { changes: Number(res.changes) } };
  }
}

class ShimDatabase {
  constructor(private readonly db: DatabaseSync) {}
  prepare(sql: string): ShimStatement {
    return new ShimStatement(this.db.prepare(sql));
  }
}

/** 실제 스키마를 로드한 인메모리 D1 셰임 DB 를 만든다. */
export function createTestDb(): D1Database {
  const db = new DatabaseSync(":memory:");
  // Cloudflare D1 은 FK 강제가 기본 비활성이다. node:sqlite 는 기본 활성이므로
  // 운영 환경(D1)과 동작을 맞추기 위해 끈다.
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(readFileSync(SCHEMA_PATH, "utf8"));
  return new ShimDatabase(db) as unknown as D1Database;
}
