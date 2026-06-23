# realtime-wait

행사·부스의 대기열을 관리하는 **포트폴리오용 실시간 대기 시스템**입니다.

참가자는 부스 대기열에 등록하고 자신의 대기 상태를 실시간에 가깝게 확인하며, 운영자는 대기열을 보고 호출·체크인·노쇼를 처리합니다.

---

## 핵심 설계 판단

realtime-wait는 행사 대기열을 관리하는 실시간 대기 시스템입니다.

초기에는 SSE/WebSocket 기반 구조를 고려했지만, **포트폴리오용 무료 데모에서는 장기 연결보다 요청량 예측 가능성이 더 중요하다고 판단**했습니다.

따라서 **Cloudflare Workers + D1 + polling** 구조를 선택했습니다.

이 구조는 사용자 수와 polling 주기로 서버 부하를 계산할 수 있어 무료 한도 안에서 안정적으로 데모를 운영하기 쉽습니다.

실제 운영 환경에서는 SSE 서버와 Redis Pub/Sub 기반 구조로 확장할 수 있도록 ADR 문서(`docs/adr/`)에 확장 방향을 정리했습니다.

### 주요 트레이드오프

| 결정 | 선택 | 이유 |
| --- | --- | --- |
| 실시간 전송 | **Polling** (SSE/WS 대신) | 3~5초 지연을 감수하는 대신 `사용자 수 × polling 주기`로 요청량을 예측 가능. 무료 데모에 적합 |
| 인프라 | **Cloudflare Workers** (직접 서버 대신) | 무료 데모 유지가 쉽고 요청 수 기반 부하 계산 가능 |
| 저장소 | **Cloudflare D1** | Workers 와 자연스럽게 통합, 무료 한도 내 데모 운영 |
| 구조 | **pnpm 모노레포** | web/worker/shared/load-test/docs 를 한 저장소에서 관리 |

자세한 내용은 [`docs/architecture.md`](docs/architecture.md) 와 [`docs/adr/`](docs/adr) 참고.

---

## 기술 스택

- **Monorepo**: pnpm workspace
- **Frontend**: React + Vite + TypeScript
- **Backend**: Cloudflare Workers (Hono)
- **Database**: Cloudflare D1 (SQLite)
- **Validation**: Zod (shared 패키지)
- **Realtime(데모)**: Polling (참가자 5초 / 운영자 3초)
- **Load Test**: k6

---

## 디렉터리 구조

```text
realtime-wait/
  apps/
    web/        React + Vite 프론트엔드 (참가자/운영자 화면)
    worker/     Cloudflare Workers API (Hono + D1)
  packages/
    shared/     공유 타입 / 상수 / Zod 스키마
  db/           D1 schema.sql / seed.sql
  load-test/
    k6/         k6 부하 테스트 스크립트
  docs/         architecture / load-test / scaling / ADR
```

---

## 빠른 시작 (로컬)

사전 요구사항: Node.js 20+, pnpm 9+

```bash
# 1) 의존성 설치
pnpm install

# 2) 로컬 D1 초기화 + seed
pnpm db:init
pnpm db:seed
# (한 번에) pnpm --filter @realtime-wait/worker db:reset

# 3) worker 실행 (http://localhost:8787)
pnpm dev:worker

# 4) 새 터미널에서 web 실행 (http://localhost:5173, /api 는 worker 로 프록시됨)
pnpm dev:web
```

브라우저에서 `http://localhost:5173` 접속:

- **참가자**: 홈 → 행사 ID(`evt_demo`) → 부스 선택 → 대기 등록 → 상태 화면(5초 자동 갱신)
- **운영자**: 상단 "관리자" → 데모 키 `demo-admin-key` 입력 → 이벤트/부스/대기열 관리(3초 자동 갱신)

---

## 부하 계산 (예측 가능성)

polling 구조의 핵심 장점은 부하를 단순 계산할 수 있다는 점입니다.

```text
참가자 100명, 5초 polling   = 초당 약 20 requests
참가자 500명, 5초 polling   = 초당 약 100 requests
10분 데모, 500명           = 500 × 120 ≈ 60,000 requests
```

k6 로 이 계산을 실제로 검증합니다. [`docs/load-test-plan.md`](docs/load-test-plan.md) 참고.

```bash
# 예) 참가자 폴링 부하
k6 run load-test/k6/participant-polling.js

# 예) 혼합 시나리오 (참가자 폴링 + 운영자 호출)
k6 run load-test/k6/mixed-scenario.js
```

---

## API 응답 형식

성공:

```json
{ "ok": true, "data": { } }
```

실패:

```json
{ "ok": false, "error": { "code": "QUEUE_ENTRY_NOT_FOUND", "message": "Queue entry not found" } }
```

엔드포인트 목록은 [`docs/architecture.md`](docs/architecture.md) 참고.

---

## MVP 범위

**포함**: 이벤트/부스 생성, 대기 등록, 상태 조회, 운영자 대기열 조회, 호출/체크인/노쇼, polling, k6 부하 테스트.

**제외(의도적)**: SMS/카카오/이메일 알림, 결제, WebSocket/SSE, 복잡한 권한 시스템, 다국어, 실제 개인정보 수집.

> 알림 기능은 과거 SMS 오발송 리스크가 있어 MVP에서 제외했습니다. 참가자 이름은 표시용이며 실제 개인정보를 수집하지 않습니다.
