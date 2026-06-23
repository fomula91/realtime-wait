# Architecture

## 개요

realtime-wait 는 행사 대기열을 관리하는 시스템으로, 세 개의 워크스페이스 패키지로 구성된다.

```text
┌─────────────┐    HTTP/JSON     ┌──────────────────┐     SQL      ┌──────────┐
│  apps/web   │ ───────────────▶ │   apps/worker    │ ───────────▶ │   D1     │
│ React/Vite  │   (polling)      │ Cloudflare Worker│              │ (SQLite) │
│ SPA         │ ◀─────────────── │  Hono + Zod      │ ◀─────────── │          │
└─────────────┘                  └──────────────────┘              └──────────┘
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
              packages/shared
        (타입 / 상수 / Zod 스키마 공유)
```

- **web** 은 정적 SPA 로 빌드되어 Workers/정적 호스팅에 배포 가능하다.
- **worker** 는 단일 Hono 앱으로 모든 API 를 제공하고 D1 에 접근한다.
- **shared** 는 web 과 worker 가 동일한 타입·검증 규칙을 쓰도록 보장한다.

## 레이어 구조 (worker)

요청은 다음 흐름을 따른다.

```text
route (Hono)  →  service (도메인 규칙)  →  repository (D1 쿼리)
        ▲                  │
        │                  ▼
   Zod 검증           AppError (표준 에러)
```

- **routes**: HTTP 바인딩과 Zod 입력 검증만 담당.
- **services**: 상태 전이 규칙, 부스 상태 검증 등 도메인 로직.
- **repositories**: D1 prepared statement 만 담당.
- **container.ts**: 요청마다 D1 바인딩으로 의존성 그래프를 조립.

에러는 `AppError` 로 던지고 `onError` 미들웨어에서 표준 응답 형식으로 변환한다. Zod 검증 실패는 `VALIDATION_ERROR` 로 매핑된다.

## 데이터 모델

| 테이블 | 역할 |
| --- | --- |
| `events` | 행사 |
| `booths` | 부스 (행사에 속함, `current_number` = 현재 호출 번호) |
| `queue_entries` | 대기 등록 1건 (`queue_number`, `status`, 단계별 timestamp) |
| `call_logs` | 등록/호출/체크인/노쇼 등 액션 이력 |
| `audit_logs` | 관리자 행위 감사 로그 (예약) |

### 상태 머신 (queue_entries.status)

```text
                 cancel
        ┌──────────────────────┐
        ▼                      │
   waiting ──call──▶ called ──check_in──▶ checked_in
        │              │
      cancel         no_show
        ▼              ▼
   cancelled        no_show
```

- `register`: 부스가 `open` 일 때만 가능. `queue_number = max + 1`.
- `call`: `waiting → called`, 부스 `current_number` 를 해당 번호로 갱신.
- `check_in`: `called → checked_in`.
- `no_show`: `called → no_show`.
- `cancel`: `waiting`/`called → cancelled` (참가자 행위).
- 허용되지 않은 전이는 `INVALID_STATE_TRANSITION` (409).

## API 목록

### Public

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/events/:eventId` | 행사 조회 |
| GET | `/api/events/:eventId/booths` | 부스 목록 |
| POST | `/api/events/:eventId/booths/:boothId/register` | 대기 등록 |
| GET | `/api/queue/:queueEntryId/status` | 내 상태 (앞 대기 인원 포함) |
| POST | `/api/queue/:queueEntryId/cancel` | 대기 취소 |

### Admin (헤더 `x-admin-key` 필요)

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/admin/events` | 이벤트 생성 |
| GET | `/api/admin/events` | 이벤트 목록 |
| GET | `/api/admin/events/:eventId` | 이벤트 조회 |
| POST | `/api/admin/events/:eventId/booths` | 부스 생성 |
| GET | `/api/admin/events/:eventId/booths` | 부스 목록 |
| GET | `/api/admin/booths/:boothId/queue` | 대기열 조회 |
| POST | `/api/admin/queue/:queueEntryId/call` | 호출 |
| POST | `/api/admin/queue/:queueEntryId/check-in` | 체크인 |
| POST | `/api/admin/queue/:queueEntryId/no-show` | 노쇼 |

## Polling 정책

| 화면 | 엔드포인트 | 주기 | 근거 |
| --- | --- | --- | --- |
| 참가자 상태 | `GET /api/queue/:id/status` | 5초 | 상태 변화 빈도가 낮음, 요청량 절감 |
| 운영자 대기열 | `GET /api/admin/booths/:id/queue` | 3초 | 운영 즉시성 필요, 운영자 수는 적음 |

- 주기는 `packages/shared/src/constants.ts` 에서 단일 출처로 관리(`PARTICIPANT_POLL_INTERVAL_MS`, `ADMIN_POLL_INTERVAL_MS`).
- `usePolling` 훅은 탭이 비활성(`visibilitychange`)이면 polling 을 멈춰 불필요한 요청을 줄인다.

## 인증 (MVP)

- 관리자 API 는 `x-admin-key` 헤더가 `ADMIN_KEY` 와 일치해야 통과한다.
- 데모용 단순 보호이며, 실제 Auth(세션/JWT/OAuth)는 MVP 이후 과제. ADR-0005/0006 참고.

## 배포 형태

- worker: `wrangler deploy` (D1 바인딩 필요).
- web: `vite build` 결과물(`dist/`)을 정적 호스팅. API 베이스는 동일 도메인 `/api` 가정(로컬은 vite proxy).
