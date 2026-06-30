import { beforeEach, describe, expect, it } from "vitest";
import type { AdminTokenRecord } from "@realtime-wait/shared";
import { AuthService } from "../src/services/auth.service.js";
import { TokenRepository } from "../src/repositories/token.repository.js";
import type { BoothRepository } from "../src/repositories/booth.repository.js";
import { nowIso } from "../src/lib/id.js";
import { createTestDb } from "./helpers/test-db.js";

const SUPER_KEY = "super-demo-key";

let auth: AuthService;
let tokens: TokenRepository;

/** resolvePrincipal 은 토큰 저장소만 의존한다(부스 저장소는 미사용). */
beforeEach(() => {
  const db = createTestDb();
  tokens = new TokenRepository(db);
  auth = new AuthService(tokens, {} as BoothRepository);
});

/** 주어진 필드로 admin_tokens 한 건을 심는다. revoked_at 지정 시 회수된 토큰. */
function seedToken(partial: Partial<AdminTokenRecord> & { token: string }): Promise<void> {
  return tokens.insert({
    role: "event",
    event_id: "evt_a",
    booth_id: null,
    label: "토큰",
    created_at: nowIso(),
    revoked_at: null,
    ...partial,
  });
}

describe("resolvePrincipal — 슈퍼 키", () => {
  it("슈퍼 키와 일치하면 super principal(전역 범위)", async () => {
    const principal = await auth.resolvePrincipal(SUPER_KEY, SUPER_KEY);
    expect(principal).toEqual({
      role: "super",
      event_id: null,
      booth_id: null,
      label: "슈퍼 어드민",
    });
  });

  it("슈퍼 키는 DB 조회 없이 우선한다(토큰이 없어도 통과)", async () => {
    expect(await auth.resolvePrincipal(SUPER_KEY, SUPER_KEY)).not.toBeNull();
  });
});

describe("resolvePrincipal — 범위 토큰 해석", () => {
  it("유효한 행사 토큰은 event 범위로 해석된다", async () => {
    await seedToken({ token: "tok_event_a", role: "event", event_id: "evt_a", label: "행사 A" });
    const principal = await auth.resolvePrincipal("tok_event_a", SUPER_KEY);
    expect(principal).toEqual({
      role: "event",
      event_id: "evt_a",
      booth_id: null,
      label: "행사 A",
    });
  });

  it("유효한 부스 토큰은 booth 범위로 해석된다", async () => {
    await seedToken({
      token: "tok_booth_a1",
      role: "booth",
      event_id: "evt_a",
      booth_id: "booth_a1",
      label: "부스 A1",
    });
    const principal = await auth.resolvePrincipal("tok_booth_a1", SUPER_KEY);
    expect(principal).toEqual({
      role: "booth",
      event_id: "evt_a",
      booth_id: "booth_a1",
      label: "부스 A1",
    });
  });
});

describe("resolvePrincipal — 거부 경계", () => {
  it("존재하지 않는 토큰은 null", async () => {
    expect(await auth.resolvePrincipal("tok_unknown", SUPER_KEY)).toBeNull();
  });

  it("회수된 토큰은 null(findActive 가 revoked_at 으로 거른다)", async () => {
    await seedToken({ token: "tok_revoked", revoked_at: nowIso() });
    expect(await auth.resolvePrincipal("tok_revoked", SUPER_KEY)).toBeNull();
  });

  it("빈 키는 super 키가 비어 있어도 super 로 승격되지 않는다", async () => {
    // provided && provided === superKey 가드: 빈 문자열은 일치 검사 전에 걸러진다.
    expect(await auth.resolvePrincipal("", "")).toBeNull();
  });

  it("슈퍼 키와 다른 임의 값은 토큰으로 조회되어 미존재 시 null", async () => {
    expect(await auth.resolvePrincipal("not-the-super-key", SUPER_KEY)).toBeNull();
  });
});
