# Load Test (k6)

[k6](https://k6.io) 기반 부하 테스트. 계획/결과 문서는 내부 설계 위키(JACOB-LLM-WIKI)에서 관리합니다.

## 사전 준비

```bash
# k6 설치 (macOS)
brew install k6

# 로컬 worker + seed
pnpm --filter @realtime-wait/worker db:reset
pnpm dev:worker   # http://localhost:8787
```

## 실행

```bash
k6 run load-test/k6/participant-register.js   # 등록 폭주
k6 run load-test/k6/participant-polling.js    # 상태 폴링 (메인)
k6 run load-test/k6/operator-calling.js       # 운영자 호출
k6 run load-test/k6/mixed-scenario.js         # 참가자+운영자 종합
```

## 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:8787` | 대상 worker 주소 |
| `EVENT_ID` | `evt_demo` | 대상 행사 ID |
| `BOOTH_ID` | `booth_a` | 대상 부스 ID |
| `ADMIN_KEY` | `demo-admin-key` | 관리자 API 키 |

```bash
BASE_URL=https://your-worker.workers.dev k6 run load-test/k6/mixed-scenario.js
```
