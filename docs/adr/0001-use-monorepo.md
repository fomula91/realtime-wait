# ADR-0001: 모노레포(pnpm workspace) 채택

- 상태: 채택
- 일자: 2026-06-23

## 맥락

web, worker, 공유 타입, load-test, docs 를 함께 관리해야 한다. 단일 프로젝트로 두면 이들이 흩어지고, 별도 저장소로 나누면 타입 공유가 번거롭다.

## 결정

pnpm workspace 기반 모노레포를 사용한다.

```text
apps/web, apps/worker, packages/shared, db, load-test, docs
```

## 근거

- web 과 worker 가 `@realtime-wait/shared` 로 타입·Zod 스키마를 단일 출처에서 공유.
- 전체 구조를 한 저장소에서 보여줄 수 있어 포트폴리오에 유리.
- pnpm 의 workspace 프로토콜(`workspace:*`)로 로컬 링크가 단순.

## 트레이드오프

- 초기 설정(워크스페이스, tsconfig 분리)이 단일 프로젝트보다 복잡.
- 빌드 도구가 워크스페이스를 인식해야 함(Vite 는 TS 소스 직접 소비로 해결).

## 대안

- 단일 프로젝트: 단순하지만 관심사가 한 곳에 뒤섞임.
- 멀티 레포: 분리는 깔끔하나 타입 공유/버전 동기화 비용 증가.
