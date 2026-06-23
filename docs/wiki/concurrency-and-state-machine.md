# 상태 머신과 동시성

## 상태 머신

```text
 waiting ─┬─► called ─┬─► checked_in
          │           └─► no_show
          └─► cancelled        (waiting/called 에서)
```

전이는 `assertTransition()`으로 강제하고, 허용 안 된 전이는 `INVALID_STATE_TRANSITION` → **409**.
각 전이는 대응 타임스탬프 컬럼만 채운다(`called_at` 등, 나머지 nullable). (`apps/worker/src/services/queue.service.ts`)

| 액션 | 출발 | 도착 |
| --- | --- | --- |
| call | `waiting` | `called` |
| check-in | `called` | `checked_in` |
| no-show | `called` | `no_show` |
| cancel | `waiting`,`called` | `cancelled` |

## 409는 정상 신호

운영자 둘이 같은 대기자를 처리하면, 먼저 도착한 쪽이 `waiting→called`를 끝낸 뒤 늦은 쪽은 409("이미 처리됨")를 받는다. 그래서 부하 테스트도 409를 실패로 세지 않는다:

```js
// load-test/k6/mixed-scenario.js
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 409));
```

## 한계 — 진짜 CAS가 아니다

전이는 `findById → assertTransition → updateStatus` 순서인데, UPDATE에 상태 가드가 없다:

```sql
-- queue.repository.ts:76
UPDATE queue_entries SET status=?, called_at=? WHERE id=?   -- status 조건 없음
```

→ 두 운영자가 **거의 동시에** 같은 `waiting`을 읽으면 둘 다 통과·덮어쓴다. 409는 한쪽이 UPDATE를 끝낸 **뒤** 읽었을 때만 난다. 데모에선 D1 쓰기 직렬성 + "부스당 운영자 1명" 가정으로 가려진다.

**실 운영 확장 시:** 조건부 UPDATE로 CAS를 DB에 위임.

```sql
UPDATE ... WHERE id=? AND status='waiting';   -- 0 rows → 이미 처리됨 → 409
```

## 곁가지: 순번 비재정렬

순번은 `MAX(queue_number)+1`로만 발급, 취소/노쇼가 생겨도 재정렬 안 함(번호 변동 = 혼란). 대신 "앞 대기 인원"을 상대 위치로 실시간 계산하므로 체감 대기는 정확히 준다:

```sql
-- queue.repository.ts:35  countAhead()
SELECT COUNT(*) ... WHERE booth_id=? AND queue_number<? AND status IN ('waiting','called')
```

`idx_queue_booth_status (booth_id, status, queue_number)`로 최적화. (`db/schema.sql`)
