# 폴링 주기 단일 출처

"부하 = 사용자 수 × (1/주기)"가 성립하려면 주기가 한 곳에서만 정의돼야 한다.

```ts
// packages/shared/src/constants.ts — 유일한 정의
export const PARTICIPANT_POLL_INTERVAL_MS = 5000;
export const ADMIN_POLL_INTERVAL_MS = 3000;
```

프론트 화면들은 값을 복제하지 않고 import한다. 폴링 타이머와 "N초마다 자동 갱신" 문구까지 같은 상수에서 계산하므로(`StatusPage.tsx:85`) 불일치가 구조적으로 불가능하다. 타입·에러 코드도 같은 shared에서 나와 프론트·백엔드가 공유한다.

## 끊긴 고리: k6는 복제한다

```js
// load-test/k6/participant-polling.js:11
const POLL_INTERVAL_S = 5;   // shared import 아님 — 하드코딩
```

k6는 독립 실행 파일이라 shared를 직접 못 가져와 값을 베껴 둔 상태. 주기를 바꾸면 프론트는 자동, **k6와 부하 계산식은 수동**으로 고쳐야 한다. → config가 shared를 주입하도록 연결하거나, 어긋남 검증 추가(개선 후보).
