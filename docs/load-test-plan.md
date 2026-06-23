# Load Test Plan

## 목적

polling 구조의 핵심 주장인 **"부하를 예측 가능하다"** 를 k6 로 실제 검증한다.

`사용자 수 × polling 주기` 로 계산한 이론적 요청량이 실측 요청량/지연과 일치하는지 확인하는 것이 목표다.

## 부하 계산 (이론)

```text
참가자 100명, 5초 polling   = 100 / 5  = 초당 약 20 requests
참가자 500명, 5초 polling   = 500 / 5  = 초당 약 100 requests
10분 데모, 500명           = 500 × (600 / 5) = 60,000 requests

운영자 측: 부스당 1~2명, 3초 polling → 부스당 초당 < 1 request
```

## 시나리오

| 스크립트 | 목적 | 부하 모델 |
| --- | --- | --- |
| `participant-register.js` | 등록 폭주 처리 | ramping 0→50 VU, 등록 위주 |
| `participant-polling.js` | 상태 폴링 부하 | 100 VU 2분, 등록 후 5초 주기 폴링 |
| `operator-calling.js` | 운영자 호출 처리 | 3 VU 1분, 3초 주기 조회+호출 |
| `mixed-scenario.js` | 종합(메인) | 참가자 120 VU + 운영자 2 VU 동시 |

## 임계값 (thresholds)

각 스크립트 `options.thresholds` 에 정의한다.

- `http_req_failed: rate < 0.01~0.02` (실패율 1~2% 미만)
- 상태 조회 `p(95) < 500~600ms`
- 대기열 조회 `p(95) < 600~800ms`

D1 동시성으로 인해 호출 액션은 `200` 또는 `409`(이미 호출됨)를 모두 정상으로 간주한다.

## 실행 방법

사전: 로컬 worker 실행 + D1 seed.

```bash
pnpm --filter @realtime-wait/worker db:reset
pnpm dev:worker   # http://localhost:8787

# 다른 터미널
k6 run load-test/k6/participant-polling.js
k6 run load-test/k6/mixed-scenario.js
```

대상/데이터는 환경변수로 바꿀 수 있다.

```bash
BASE_URL=https://realtime-wait.example.workers.dev \
EVENT_ID=evt_demo BOOTH_ID=booth_a ADMIN_KEY=demo-admin-key \
k6 run load-test/k6/mixed-scenario.js
```

## 측정 항목

- `http_reqs` (총/초당 요청 수) → 이론 계산과 비교.
- `http_req_duration` p(50)/p(95)/p(99).
- `http_req_failed` 비율.
- 시나리오별 태그(`name:status`, `name:queue`, `name:call`)별 분해.

## 결과 기록

실행 결과는 [`load-test-report.md`](load-test-report.md) 에 표/그래프와 함께 기록한다.
무료 한도(Cloudflare Workers/D1) 대비 여유를 함께 적는다.
