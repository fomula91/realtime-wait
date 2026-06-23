# Wiki

ADR가 "무엇을 왜 골랐나"라면, 위키는 **코드에 있지만 설계 문서엔 안 드러나는 검증·한계**를 모은다.

| 문서 | 요약 |
| --- | --- |
| [polling-load-validation.md](polling-load-validation.md) | 폴링 부하 예측을 k6로 실측 검증(이론 ≈ 실측) + 동기화 버스트 약점 |
| [concurrency-and-state-machine.md](concurrency-and-state-machine.md) | 상태 머신·409의 의미 + 현재 구현이 CAS가 아니라는 한계 |
| [shared-single-source.md](shared-single-source.md) | 폴링 주기 단일 출처 구조와 끊긴 고리(k6 복제) |

관련: [`../adr/`](../adr) · [`../architecture.md`](../architecture.md) · [`../load-test-report.md`](../load-test-report.md) · [`../scaling-strategy.md`](../scaling-strategy.md)
