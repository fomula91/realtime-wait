# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# 이 저장소의 검증 단계 (Verification Stages)

변경 후 무엇을 돌릴지 추측하지 말고 아래 표를 따른다. 단계는 빠르고 결정적인 것부터 느리고 수동적인 것 순서다: **unit → route → type/build → k6 load**. 앞 단계가 깨지면 뒷 단계는 의미가 없으니 순서대로 본다.

## 변경 종류 → 실행할 검증

| 변경한 곳 | 1차로 돌릴 것 | 비고 |
| --- | --- | --- |
| `services/*`, `lib/*` (도메인·상태 전이 로직) | **unit**: `pnpm --filter @realtime-wait/worker test queue.service scope` | 순수/서비스 로직. 네트워크·앱 부팅 없음 |
| `routes/*`, `middleware/*`, 권한(`lib/scope.ts`) | **route**: `pnpm --filter @realtime-wait/worker test admin-auth public-routes` | `app.request()`로 미들웨어+라우트+셰임 D1 통과. 상태코드/에러코드 고정 |
| `packages/shared`, 타입·zod 스키마 | **type**: `pnpm typecheck` + 위 영향 받는 test | 타입 계약이 소비처(worker/web)와 맞는지 |
| 의존성·락파일·`scripts/`·`.npmrc`·CI | **build/verify**: `pnpm verify` | 환경 점검 → frozen install → typecheck → test 전체 |
| 성능 특성(폴링 주기, 동시성, 인덱스, 쿼리) | **k6 load**: 아래 "k6는 별도" 참고 | 정확성이 아니라 **부하 거동**만 본다 |

> 한 PR이 여러 곳을 건드리면 가장 무거운 단계까지 포함한다. 전부 묶어 한 번에 보려면 `pnpm verify`(unit+route+type) 하나로 충분하고, 부하 회귀가 의심될 때만 k6를 추가한다.

## `pnpm verify`는 공식 입구다 (우회 금지)

- **항상 `pnpm verify`로 돈다.** `./node_modules/.bin/*` 직접 실행이나 vitest 단독 호출로 우회하지 않는다. verify 순서는 `check:env → frozen install → typecheck → test`이고, `check:env`가 install보다 **먼저** 돈다(`&&` 직렬, `node` 빌트인만 써서 node_modules 없이도 실행됨). 이 순서가 깨지면 실패 원인 분류가 무너진다.
- **pnpm 버전은 corepack으로 고정한다.** `corepack enable` 상태면 `packageManager: pnpm@9.15.0` 핀이 자동으로 잡힌다(`corepack pnpm --version` → 9.15.0). 핀과 다른 pnpm으로 돌면 `check:env`가 `ENVIRONMENT ERROR: pnpm 버전 불일치`로 즉시 막는다.
- **비대화형(CI/새 세션)에서는 `CI=true`를 권장한다.** node_modules가 설정과 어긋나 "전체 재설치" 프롬프트가 뜰 수 있는 상황(예: pnpm 설정 변경 직후 한 번)에서 `CI=true pnpm verify`는 멈추지 않고 자동 진행한다. 새 클론(node_modules 없음)에서는 이 프롬프트 자체가 없다.
- **pnpm 10+ 빌드 승인 정책은 미리 해소돼 있다.** 빌드 스크립트를 가진 dev 의존성(`esbuild`/`sharp`/`workerd`)을 `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 등록해, pnpm 10/11의 `approve-builds` 프롬프트나 `Ignored build scripts` 경고로 verify가 멈추지 않게 했다. 이들은 verify(typecheck+vitest, `node:sqlite` 사용)에 필요 없지만 dev(`pnpm dev:worker`)에는 필요하므로 차단이 아니라 사전 승인으로 처리한다.

## k6는 별도다 (unit/route와 역할이 다름)

- **목적이 다르다.** vitest(unit/route)는 **정확성**(상태코드·전이·권한·검증)을 본다. k6는 **성능·동시성 거동**(req/s, 지연, 경합 시 409 비율)을 본다. 서로 대체하지 않는다.
- **CI/`pnpm test`에 포함되지 않는다.** 실행 중인 worker가 필요하다: `pnpm --filter @realtime-wait/worker db:reset && pnpm dev:worker` (→ `http://localhost:8787`) 후 `k6 run load-test/k6/<scenario>.js`.
- **409는 k6에서 정상이다.** 낙관적 동시성 제어상 동시 호출의 패배자는 409다 — 부하 테스트 실패가 아니다(`operator-calling.js` 주석 참고). 정확성 회귀는 route test에서 잡고, k6로 잡지 않는다.

## 실패 시 원인 분류

실제 출력의 첫 토큰으로 분류한다(아래 문자열은 실측 기준).

| 실제 출력에 보이는 것 | 분류 | 대응 |
| --- | --- | --- |
| `[check-env] ENVIRONMENT ERROR: pnpm 버전 불일치` | **환경**(pnpm 버전) | `corepack enable && corepack use pnpm@9.15.0` |
| `[check-env] ENVIRONMENT ERROR: node 버전 미달` | **환경**(node 버전) | node 20+ 로 전환 |
| `ERR_PNPM_OUTDATED_LOCKFILE` (frozen install) | **의존성/락파일** | `pnpm install` 후 `pnpm-lock.yaml` 커밋. 코드 문제 아님 |
| `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR` / "전체 재설치" 프롬프트 | **환경**(node_modules 상태 불일치) | `CI=true pnpm verify` 또는 `node_modules` 지우고 재설치. 새 클론엔 없음 |
| `approve-builds` 프롬프트 / `Ignored build scripts` | **환경**(pnpm 10+ 정책) | `onlyBuiltDependencies`로 이미 해소. 새 빌드 의존성이면 거기에 추가 |
| `tsc` 에러(`error TS****`) | **코드(타입)** | 타입/스키마 계약 위반 |
| vitest 실패(`✗`, `Tests N failed`) | **코드(로직·라우트)** | 도메인 로직 또는 라우트/권한 회귀 |
| k6 threshold 미달(`✗ ... thresholds`) | **성능/인프라** | 부하 거동 회귀(또는 측정 환경). correctness 아님 |

`[check-env]`/`ERR_PNPM_*`(환경·의존성)와 `tsc`/vitest(코드)를 먼저 가른 뒤, 환경 문제를 코드로 고치려 들지 않는다.

먼저 `[check-env]`/`frozen-lockfile`인지(환경) 아니면 `tsc`/vitest인지(코드)를 가른 뒤, 환경 문제를 코드로 고치려 들지 않는다.
