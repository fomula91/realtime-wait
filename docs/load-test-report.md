# Load Test Report

실행 방법은 [`load-test-plan.md`](load-test-plan.md) 참고. 아래 수치는 **로컬 `wrangler dev`(miniflare) 대상** 실측값이다.

## 실행 환경

| 항목 | 값 |
| --- | --- |
| 일시 | 2026-06-23 |
| 대상 | local worker (`http://localhost:8787`, `wrangler dev` / miniflare) |
| k6 버전 | v1.4.2 (darwin/arm64) |
| 머신 | Apple Silicon (darwin 25.5) |

> 로컬 측정값이며 배포된 Cloudflare Workers 의 실제 용량과는 다르다. 특히 연결 수용 한계는 로컬 런타임 특성이다(아래 "핵심 관찰" 참고).

## 시나리오별 결과

### participant-register.js — 등록 폭주 (0→50 VU, 60s)

| 지표 | 결과 |
| --- | --- |
| 총 요청 수 | 2,254 |
| 처리량 | 약 37 req/s |
| `http_req_duration` p(95) | 12.65 ms |
| `http_req_failed` | 0.00% |
| checks | 100% (status 201 / ok=true) |
| threshold | ✅ 통과 |

### participant-polling.js — 상태 폴링 (100 VU, 2m)

| 지표 | 결과 |
| --- | --- |
| 총 요청 수 | 2,916 |
| 처리량 | 약 21 req/s |
| status p(95) | 205.6 ms |
| `http_req_failed` | 3.97% (연결 리셋, 후술) |
| checks | 97.8% |
| threshold | ✅ 통과 (`rate<0.05`) |

> 100 VU 가 동시에 등록 후 **동일한 5초 주기로 동기화되어** 폴링하기 때문에 버스트가 겹쳐 p(95)가 다른 시나리오보다 높다. 실제 환경에서는 접속 시점이 분산되어 더 완만하다.

### operator-calling.js — 운영자 호출 (1 VU/부스, 1m)

| 지표 | 결과 |
| --- | --- |
| 총 요청 수 | 23 |
| queue p(95) | 28.5 ms |
| `http_req_failed` | 0.00% |
| checks | 100% |
| threshold | ✅ 통과 |

> 운영자는 부스당 1명·3초 주기라 요청량이 매우 작다(시드 대기자 소진 후 조회만 발생). 운영자 측 부하는 무시 가능한 수준임을 보여준다.

### mixed-scenario.js — 종합 (참가자 0→120 VU + 운영자 1, 90s)

| 지표 | 결과 |
| --- | --- |
| 총 요청 수 | 2,601 |
| 처리량 | 약 24~26 req/s |
| status p(95) | 29.6 ms |
| queue p(95) | 28.0 ms |
| `http_req_failed` | 2.38% (연결 리셋) |
| checks | 100% |
| threshold | ✅ 통과 |

## 이론 대비 분석 (부하 예측 가능성 검증)

CLAUDE.md 의 핵심 주장 — `사용자 수 × (1/폴링주기)` 로 요청량 예측 — 을 확인한다.

```text
mixed: 참가자 ~120명 × (1/5s) ≈ 24 req/s (폴링)
       + 등록/운영자 오버헤드
실측: 약 24~26 req/s  → 이론값과 일치
```

폴링 주기와 동시 사용자 수만으로 초당 요청량을 사실상 정확히 예측할 수 있음을 확인했다. 이는 polling 선택의 핵심 근거(ADR-0004)를 뒷받침한다.

## 핵심 관찰 — 실패의 정체

부하 중 발생한 `http_req_failed`(2~4%)는 **애플리케이션 오류가 아니다.** 원인을 다음과 같이 규명했다.

1. worker 접근 로그상 **실제 도달한 요청은 전부 2xx**(200/201), 비-2xx 0건.
2. k6 의 실패 건수 = (k6 총 요청 수) − (worker 가 기록한 요청 수) 와 정확히 일치.
3. k6 에러 메시지는 모두 `connection reset by peer` / `EOF` (POST register).

→ 즉 **로컬 `wrangler dev`(miniflare/workerd)가 버스트 시 일부 TCP 연결을 수용하지 못해 리셋**한 것이다. 배포된 Cloudflare Workers 는 엣지에서 연결을 처리하므로 이 한계에 해당하지 않는다.

대응:
- 부하 스크립트를 **연결 실패에 견고하게**(응답 body 가 없을 때 방어적 파싱) 보강했다.
- threshold 의 `http_req_failed` 는 로컬 노이즈를 감안해 5% 로 두되, **실질 성능 게이트는 지연 시간 p(95)** 로 둔다(모두 통과).

## 무료 한도 대비 평가

```text
Cloudflare Workers 무료: 일 100,000 requests
10분 데모(500명, 5초 polling): 약 60,000 requests
→ 하루 1회 풀 데모 가능, 여유율 약 40%
```

지연 시간(로컬 p95 ≈ 30ms, 폴링 동기화 시 ≈ 200ms)은 데모 체감에 충분하다.

## 후속 과제

- 배포된 Worker 대상 재측정(`BASE_URL` 교체)으로 실제 엣지 용량 확인.
- 폴링 주기 동적 조정 / ETag·304 도입 시 요청량 절감 효과 측정([scaling-strategy](scaling-strategy.md) 1단계).
- 사용자 접속 시점 분산(현실적 도착 분포)을 반영한 시나리오 추가.
